<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Callback cuando el usuario retorna de Mercado Pago tras pagar.
 * Sincroniza estado desde MP si hay payment_id (por si el webhook no llegó).
 * Redirige al frontend con el estado.
 *
 * GET /api/v1/mercadopago/payment-callback?ref=P-123&status=approved
 * MP puede añadir: payment_id, collection_status, external_reference
 */
class MercadoPagoPaymentCallbackController extends Controller
{
    public function __invoke(Request $request)
    {
        $ref = $request->query('ref');
        $status = $request->query('status', $request->query('collection_status', 'unknown'));
        $mpPaymentId = $request->query('payment_id');

        $frontendUrl = rtrim(config('app.frontend_url', config('app.url')), '/');

        if (!$ref || !preg_match('/^P-(\d+)$/', $ref, $m)) {
            Log::warning('MercadoPago callback: ref inválido', ['ref' => $ref]);
            return redirect("{$frontendUrl}/dashboard/pagos?callback=error");
        }

        $paymentId = (int) $m[1];
        $payment = Payment::find($paymentId);

        if (!$payment) {
            Log::warning('MercadoPago callback: Payment no encontrado', ['payment_id' => $paymentId]);
            return redirect("{$frontendUrl}/dashboard/pagos?callback=not_found");
        }

        // Sincronizar desde MP si tenemos payment_id (útil cuando webhook no llega, ej. local)
        if ($mpPaymentId && $payment->status === 'pending') {
            $this->syncPaymentFromMp($paymentId, $mpPaymentId);
        }

        $redirectUrl = "{$frontendUrl}/dashboard/pagos/{$paymentId}?mp_status={$status}";

        Log::info('MercadoPago callback: redirigiendo', [
            'payment_id' => $paymentId,
            'status'     => $status,
        ]);

        return redirect($redirectUrl);
    }

    private function syncPaymentFromMp(int $paymentId, string $mpPaymentId): void
    {
        try {
            $paymentClientClass = 'MercadoPago\Client\Payment\PaymentClient';
            $paymentClient = new $paymentClientClass();
            $mpPayment = $paymentClient->get($mpPaymentId);

            $externalRef = $mpPayment->external_reference ?? '';
            if (!preg_match('/^P-(\d+)$/', $externalRef, $m) || (int) $m[1] !== $paymentId) {
                return;
            }

            $newStatus = match ($mpPayment->status ?? '') {
                'approved' => 'paid',
                'rejected', 'cancelled', 'refunded', 'charged_back' => 'cancelled',
                default => 'pending',
            };

            Payment::where('id', $paymentId)->update([
                'status'   => $newStatus,
                'method'   => $newStatus === 'paid' ? 'mercadopago' : null,
                'paid_at'  => $newStatus === 'paid' ? now() : null,
                'mercadopago_status' => $mpPayment->status ?? null,
                'mercadopago_status_detail' => $mpPayment->status_detail ?? null,
            ]);

            Log::info('MercadoPago callback: Payment sincronizado desde MP', [
                'payment_id' => $paymentId,
                'mp_status'  => $mpPayment->status,
            ]);
        } catch (\Throwable $e) {
            Log::warning('MercadoPago callback: error al sincronizar', [
                'payment_id' => $paymentId,
                'error'      => $e->getMessage(),
            ]);
        }
    }
}
