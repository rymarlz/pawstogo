<?php

namespace App\Services\Payments;

class PaymentProviderFactory
{
  public static function make(string $provider): PaymentProvider
  {
    return match ($provider) {
      'manual' => new ManualPaymentProvider(),
      'webpay_plus' => new WebpayPlusProvider(),
      'mercadopago' => new MercadoPagoProvider(),
      default => throw new \InvalidArgumentException("Unsupported provider: {$provider}"),
    };
  }
}
