<?php

namespace App\Services\Payments;

use App\Models\PaymentIntent;
use App\Models\PaymentTransaction;

/**
 * Provider “stub” listo para enchufar SDK/HTTP de Transbank.
 * Importante: aquí NO hacemos el SDK real para no amarrarte,
 * pero deja el contrato y persistencia lista.
 */
class WebpayPlusProvider implements PaymentProvider
{
  public function start(PaymentIntent $intent, array $context = []): PaymentTransaction
  {
    // Aquí vas a crear la transacción en Transbank y obtener token + url
    // buyOrder/sessionId/amount/returnUrl...

    $buyOrder = 'PI-'.$intent->id.'-'.now()->format('YmdHis');
    $returnUrl = $context['return_url'] ?? null;

    // SIMULACIÓN ESTRUCTURA (reemplazas por llamada real)
    $externalToken = 'TBK_TOKEN_PLACEHOLDER_'.$buyOrder;
    $redirectUrl = $context['redirect_url'] ?? null; // webpay form url

    $tx = PaymentTransaction::create([
      'payment_intent_id' => $intent->id,
      'provider' => 'webpay_plus',
      'status' => 'initiated',
      'amount' => $intent->amount_total,
      'currency' => $intent->currency,
      'external_id' => $externalToken,
      'redirect_url' => $redirectUrl,
      'return_url' => $returnUrl,
      'request_payload' => [
        'buy_order' => $buyOrder,
        'return_url' => $returnUrl,
        'context' => $context,
      ],
    ]);

    // Al iniciar por webpay, dejamos intent pending
    $intent->status = 'pending';
    $intent->provider = 'webpay_plus';
    $intent->save();

    return $tx;
  }

  public function commit(array $callbackPayload): PaymentTransaction
  {
    // Aquí harás commit con token_ws, obtendrás status/response_code/auth_code...
    // Luego actualizas PaymentIntent a paid o failed según corresponda.

    throw new \RuntimeException('WebpayPlus commit not implemented yet.');
  }
}
