<?php

namespace App\Services\Payments;

use App\Models\PaymentIntent;
use App\Models\PaymentTransaction;

class ManualPaymentProvider implements PaymentProvider
{
  public function start(PaymentIntent $intent, array $context = []): PaymentTransaction
  {
    // Manual: no redirección; solo crea transacción "initiated"
    return PaymentTransaction::create([
      'payment_intent_id' => $intent->id,
      'provider' => 'manual',
      'status' => 'initiated',
      'amount' => $intent->amount_total,
      'currency' => $intent->currency,
      'request_payload' => $context,
    ]);
  }

  public function commit(array $callbackPayload): PaymentTransaction
  {
    // Manual no usa callback
    throw new \RuntimeException('Manual provider does not support commit callback.');
  }
}
