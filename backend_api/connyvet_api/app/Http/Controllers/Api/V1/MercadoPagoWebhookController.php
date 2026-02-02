<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PaymentIntent;
use App\Services\Payments\PaymentProviderFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * Controller para manejar webhooks y callbacks de MercadoPago
 * 
 * Este controller maneja:
 * - Webhooks (notificaciones automáticas de MercadoPago)
 * - Callbacks (retorno del usuario después del pago)
 */
class MercadoPagoWebhookController extends Controller
{
    /**
     * Webhook de MercadoPago
     * 
     * MercadoPago envía notificaciones POST a esta URL cuando cambia
     * el estado de un pago. Esta es la forma más confiable de saber
     * el estado real del pago.
     * 
     * POST /api/v1/payment-intents/{id}/mercadopago/webhook
     */
    public function webhook(int $id, Request $request)
    {
        try {
            $intent = PaymentIntent::findOrFail($id);

            // Validar payload del webhook
            $validator = Validator::make($request->all(), [
                'type' => ['required', 'string'],
                'data.id' => ['required', 'string'],
            ]);

            if ($validator->fails()) {
                Log::warning('MercadoPago webhook validation failed', [
                    'payment_intent_id' => $id,
                    'errors' => $validator->errors(),
                    'payload' => $request->all(),
                ]);

                return response()->json(['error' => 'Invalid payload'], 400);
            }

            $type = $request->input('type');
            $paymentId = $request->input('data.id');

            // Validar firma x-signature (documentación MercadoPago: HMAC-SHA256 del manifest con secret)
            $webhookSecret = config('services.mercadopago.webhook_secret');
            if (!empty($webhookSecret)) {
                if (!$this->validateMercadoPagoWebhookSignature($request, $paymentId, $webhookSecret)) {
                    Log::warning('MercadoPago webhook signature validation failed', [
                        'payment_intent_id' => $id,
                        'payment_id' => $paymentId,
                    ]);

                    return response()->json(['error' => 'Invalid signature'], 401);
                }
            } else {
                Log::warning('MercadoPago webhook secret not configured; x-signature validation skipped. Set MERCADOPAGO_WEBHOOK_SECRET for production.');
            }

            // Solo procesar notificaciones de payment
            if ($type !== 'payment') {
                Log::info('MercadoPago webhook ignored (not a payment)', [
                    'payment_intent_id' => $id,
                    'type' => $type,
                ]);

                return response()->json(['status' => 'ignored'], 200);
            }

            // Obtener información completa del pago desde MercadoPago (clase como string evita "Undefined type")
            $paymentClientClass = 'MercadoPago\Client\Payment\PaymentClient';
            $paymentClient = new $paymentClientClass();
            $payment = $paymentClient->get($paymentId);

            // Verificar que el external_reference coincida
            $expectedReference = "PI-{$id}";
            if ($payment->external_reference !== $expectedReference) {
                Log::warning('MercadoPago webhook external_reference mismatch', [
                    'payment_intent_id' => $id,
                    'expected' => $expectedReference,
                    'received' => $payment->external_reference,
                ]);

                return response()->json(['error' => 'External reference mismatch'], 400);
            }

            // Procesar el pago usando el provider
            $provider = PaymentProviderFactory::make('mercadopago');
            $tx = $provider->commit([
                'data' => [
                    'id' => $paymentId,
                ],
                'id' => $paymentId,
                'external_reference' => $payment->external_reference,
            ]);

            Log::info('MercadoPago webhook processed successfully', [
                'payment_intent_id' => $id,
                'payment_id' => $paymentId,
                'status' => $payment->status,
            ]);

            return response()->json([
                'status' => 'ok',
                'payment_intent_id' => $id,
                'transaction_id' => $tx->id,
            ], 200);

        } catch (\Exception $e) {
            Log::error('MercadoPago webhook error', [
                'payment_intent_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'payload' => $request->all(),
            ]);

            // Retornar 200 para que MercadoPago no reintente inmediatamente
            // pero loguear el error para revisión manual
            return response()->json(['error' => 'Internal error'], 200);
        }
    }

    /**
     * Callback de retorno del usuario
     * 
     * Cuando el usuario completa el pago en MercadoPago, es redirigido
     * a esta URL. Aquí verificamos el estado y redirigimos al frontend.
     * 
     * GET /api/v1/payment-intents/{id}/mercadopago/callback
     */
    public function callback(int $id, Request $request)
    {
        try {
            $intent = PaymentIntent::with('transactions')->findOrFail($id);
            $status = $request->query('status');
            $paymentId = $request->query('payment_id');
            $preferenceId = $request->query('preference_id');

            // Si hay payment_id, obtener información del pago (clase como string evita "Undefined type")
            if ($paymentId) {
                try {
                    $paymentClientClass = 'MercadoPago\Client\Payment\PaymentClient';
                    $paymentClient = new $paymentClientClass();
                    $payment = $paymentClient->get($paymentId);

                    // Procesar el pago
                    $provider = PaymentProviderFactory::make('mercadopago');
                    $provider->commit([
                        'data' => ['id' => $paymentId],
                        'id' => $paymentId,
                        'external_reference' => $payment->external_reference,
                    ]);

                    $intent->refresh();
                } catch (\Exception $e) {
                    Log::warning('MercadoPago callback: error al obtener pago', [
                        'payment_intent_id' => $id,
                        'payment_id' => $paymentId,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Construir URL de redirección al frontend
            $frontendUrl = config('app.frontend_url', config('app.url'));
            $redirectUrl = "{$frontendUrl}/dashboard/pagos/{$id}";

            // Agregar parámetros de estado
            $redirectUrl .= "?status={$status}";
            if ($paymentId) {
                $redirectUrl .= "&payment_id={$paymentId}";
            }

            Log::info('MercadoPago callback processed', [
                'payment_intent_id' => $id,
                'status' => $status,
                'payment_id' => $paymentId,
                'redirect_url' => $redirectUrl,
            ]);

            // Redirigir al frontend
            return redirect($redirectUrl);

        } catch (\Exception $e) {
            Log::error('MercadoPago callback error', [
                'payment_intent_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $frontendUrl = config('app.frontend_url', config('app.url'));
            return redirect("{$frontendUrl}/dashboard/pagos/{$id}?status=error");
        }
    }

    /**
     * Valida la firma x-signature del webhook de MercadoPago.
     *
     * Según documentación MercadoPago: el header x-signature contiene ts (timestamp)
     * y v1 (HMAC-SHA256 en hex del manifest). El manifest sigue el formato:
     * id:{data.id};request-id:{x-request-id};ts:{ts};
     * Si algún valor no está presente, se omite esa parte del manifest.
     *
     * @see https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
     */
    private function validateMercadoPagoWebhookSignature(Request $request, string $dataId, string $secret): bool
    {
        $xSignature = $request->header('x-signature');
        if (empty($xSignature)) {
            return false;
        }

        $ts = null;
        $hash = null;
        foreach (explode(',', $xSignature) as $part) {
            $keyValue = explode('=', trim($part), 2);
            if (count($keyValue) === 2) {
                $key = trim($keyValue[0]);
                $value = trim($keyValue[1]);
                if ($key === 'ts') {
                    $ts = $value;
                } elseif ($key === 'v1') {
                    $hash = $value;
                }
            }
        }

        if ($ts === null || $hash === null) {
            return false;
        }

        // data.id: si es alfanumérico, MercadoPago lo envía en minúsculas en el manifest
        $idForManifest = preg_match('/^[a-zA-Z0-9]+$/', $dataId) ? strtolower($dataId) : $dataId;
        $xRequestId = $request->header('x-request-id');

        $parts = ["id:{$idForManifest}", "ts:{$ts}"];
        if ($xRequestId !== null && $xRequestId !== '') {
            $parts = ["id:{$idForManifest}", 'request-id:' . $xRequestId, "ts:{$ts}"];
        }
        $manifest = implode(';', $parts) . ';';

        $expectedHash = hash_hmac('sha256', $manifest, $secret);

        return hash_equals($expectedHash, $hash);
    }
}
