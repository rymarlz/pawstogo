<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentIntent;
use App\Services\Payments\PaymentProviderFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * Webhook genérico de Mercado Pago para Payment (P-{id}) y PaymentIntent (PI-{id}).
 * Recibe notificaciones por external_reference.
 *
 * POST /api/v1/mercadopago/webhook
 */
class MercadoPagoPaymentWebhookController extends Controller
{
    public function webhook(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'type'    => ['required', 'string'],
                'data.id' => ['required', 'string'],
            ]);

            if ($validator->fails()) {
                Log::warning('MercadoPago webhook validation failed', [
                    'errors'  => $validator->errors(),
                    'payload' => $request->all(),
                ]);
                return response()->json(['error' => 'Invalid payload'], 400);
            }

            $type = $request->input('type');
            $mpPaymentId = $request->input('data.id');

            if ($type !== 'payment') {
                Log::info('MercadoPago webhook ignored', ['type' => $type]);
                return response()->json(['status' => 'ignored'], 200);
            }

            $this->validateWebhookSignature($request, $mpPaymentId);

            $paymentClientClass = 'MercadoPago\Client\Payment\PaymentClient';
            $paymentClient = new $paymentClientClass();
            $mpPayment = $paymentClient->get($mpPaymentId);

            $externalRef = $mpPayment->external_reference ?? '';

            if (preg_match('/^P-(\d+)$/', $externalRef, $m)) {
                $this->handlePaymentUpdate((int) $m[1], $mpPayment);
                return response()->json(['status' => 'ok', 'type' => 'payment'], 200);
            }

            if (preg_match('/^PI-(\d+)$/', $externalRef, $m)) {
                $intentId = (int) $m[1];
                $provider = PaymentProviderFactory::make('mercadopago');
                $provider->commit([
                    'data' => ['id' => $mpPaymentId],
                    'id'   => $mpPaymentId,
                    'external_reference' => $externalRef,
                ]);
                Log::info('MercadoPago webhook: PaymentIntent actualizado', [
                    'payment_intent_id' => $intentId,
                    'mp_payment_id'     => $mpPaymentId,
                ]);
                return response()->json(['status' => 'ok', 'type' => 'payment_intent'], 200);
            }

            Log::warning('MercadoPago webhook: external_reference no reconocido', [
                'external_reference' => $externalRef,
                'mp_payment_id'      => $mpPaymentId,
            ]);
            return response()->json(['status' => 'ignored', 'reason' => 'unknown_reference'], 200);

        } catch (\Exception $e) {
            Log::error('MercadoPago webhook error', [
                'error'   => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
                'payload' => $request->all(),
            ]);
            return response()->json(['error' => 'Internal error'], 200);
        }
    }

    private function handlePaymentUpdate(int $paymentId, object $mpPayment): void
    {
        $payment = Payment::find($paymentId);
        if (!$payment) {
            Log::warning('MercadoPago webhook: Payment no encontrado', ['payment_id' => $paymentId]);
            return;
        }

        $newStatus = $this->mapMpStatus($mpPayment->status);

        $payment->update([
            'status'   => $newStatus,
            'method'   => $newStatus === 'paid' ? 'mercadopago' : $payment->method,
            'paid_at'  => $newStatus === 'paid' ? now() : $payment->paid_at,
            'mercadopago_status' => $mpPayment->status ?? null,
            'mercadopago_status_detail' => $mpPayment->status_detail ?? null,
        ]);

        Log::info('MercadoPago webhook: Payment actualizado', [
            'payment_id'    => $paymentId,
            'mp_status'     => $mpPayment->status,
            'new_status'    => $newStatus,
        ]);
    }

    private function mapMpStatus(string $mpStatus): string
    {
        return match ($mpStatus) {
            'approved'                    => 'paid',
            'rejected', 'cancelled', 'refunded', 'charged_back' => 'cancelled',
            'pending', 'in_process', 'in_mediation' => 'pending',
            default                       => 'pending',
        };
    }

    private function validateWebhookSignature(Request $request, string $dataId): void
    {
        $secret = config('services.mercadopago.webhook_secret');
        if (empty($secret)) {
            Log::warning('MERCADOPAGO_WEBHOOK_SECRET no configurado');
            return;
        }

        $xSignature = $request->header('x-signature');
        if (empty($xSignature)) {
            throw new \RuntimeException('Missing x-signature');
        }

        $ts = $hash = null;
        foreach (explode(',', $xSignature) as $part) {
            $kv = explode('=', trim($part), 2);
            if (count($kv) === 2) {
                if (trim($kv[0]) === 'ts') $ts = trim($kv[1]);
                if (trim($kv[0]) === 'v1') $hash = trim($kv[1]);
            }
        }

        if ($ts === null || $hash === null) {
            throw new \RuntimeException('Invalid x-signature format');
        }

        $idForManifest = preg_match('/^[a-zA-Z0-9]+$/', $dataId) ? strtolower($dataId) : $dataId;
        $xRequestId = $request->header('x-request-id');
        $parts = $xRequestId ? ["id:{$idForManifest}", "request-id:{$xRequestId}", "ts:{$ts}"] : ["id:{$idForManifest}", "ts:{$ts}"];
        $manifest = implode(';', $parts) . ';';
        $expectedHash = hash_hmac('sha256', $manifest, $secret);

        if (!hash_equals($expectedHash, $hash)) {
            throw new \RuntimeException('Invalid webhook signature');
        }
    }
}
