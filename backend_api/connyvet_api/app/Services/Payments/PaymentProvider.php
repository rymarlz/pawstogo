<?php

namespace App\Services\Payments;

use App\Models\PaymentIntent;
use App\Models\PaymentTransaction;

interface PaymentProvider
{
  public function start(PaymentIntent $intent, array $context = []): PaymentTransaction;
  public function commit(array $callbackPayload): PaymentTransaction;
}
