<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\Log;

/**
 * Crea preferencias de Mercado Pago para Payment (link de pago por email).
 * external_reference: P-{payment_id}
 */
class PaymentLinkService
{
    private object $preferenceClient;
    private string $accessToken;
    private string $environment;

    public function __construct()
    {
        $this->accessToken = config('services.mercadopago.access_token');
        $this->environment = config('services.mercadopago.environment', 'sandbox');

        if (empty($this->accessToken)) {
            throw new \RuntimeException('MercadoPago access token no configurado.');
        }

        $mpConfig = 'MercadoPago\MercadoPagoConfig';
        $mpConfig::setAccessToken($this->accessToken);
        $mpConfig::setRuntimeEnviroment(
            $this->environment === 'production' ? 'production' : 'local'
        );

        $preferenceClientClass = 'MercadoPago\Client\Preference\PreferenceClient';
        $this->preferenceClient = new $preferenceClientClass();
    }

    /**
     * Crea preferencia en Mercado Pago y devuelve [checkout_url, preference_id].
     *
     * @return array{checkout_url: string, preference_id: string}
     */
    public function createPreferenceForPayment(Payment $payment): array
    {
        $payment->load(['patient', 'tutor']);

        $appUrl = rtrim(config('app.url'), '/');
        $frontendUrl = rtrim(config('app.frontend_url', $appUrl), '/');

        $externalRef = "P-{$payment->id}";
        $returnUrl = "{$appUrl}/api/v1/mercadopago/payment-callback?ref={$externalRef}";
        $webhookUrl = "{$appUrl}/api/v1/mercadopago/webhook";

        $payer = $this->buildPayer($payment);

        $preferenceData = [
            'items' => [
                [
                    'title' => $payment->concept,
                    'description' => "Pago #{$payment->id} - {$payment->concept}",
                    'quantity' => 1,
                    'currency_id' => 'CLP',
                    'unit_price' => (float) $payment->amount,
                ],
            ],
            'payer' => $payer,
            'back_urls' => [
                'success' => $returnUrl . '&status=approved',
                'failure' => $returnUrl . '&status=rejected',
                'pending' => $returnUrl . '&status=pending',
            ],
            'auto_return' => 'approved',
            'external_reference' => $externalRef,
            'statement_descriptor' => substr(config('app.name', 'ConnyVet'), 0, 13),
        ];

        $isLocalhost = str_starts_with($webhookUrl, 'http://127.0.0.1') || str_starts_with($webhookUrl, 'http://localhost');
        if ($this->environment === 'production' || !$isLocalhost) {
            $preferenceData['notification_url'] = $webhookUrl;
        } else {
            Log::warning('PaymentLinkService: notification_url omitida (localhost no accesible para MP)', [
                'payment_id' => $payment->id,
            ]);
        }

        Log::info('PaymentLinkService: creando preferencia', [
            'payment_id' => $payment->id,
            'external_reference' => $externalRef,
        ]);

        $preference = $this->preferenceClient->create($preferenceData);

        $checkoutUrl = ($this->environment === 'production')
            ? ($preference->init_point ?? $preference->sandbox_init_point ?? null)
            : ($preference->sandbox_init_point ?? $preference->init_point ?? null);

        if (empty($checkoutUrl)) {
            throw new \RuntimeException('MercadoPago no devolvió URL de checkout.');
        }

        return [
            'checkout_url' => $checkoutUrl,
            'preference_id' => $preference->id,
            'external_reference' => $externalRef,
        ];
    }

    private function buildPayer(Payment $payment): array
    {
        $payer = [];

        if ($payment->tutor_id && $tutor = $payment->tutor) {
            $payer['name'] = $tutor->nombres ?? null;
            $payer['surname'] = $tutor->apellidos ?? null;
            $payer['email'] = $tutor->email ?? $tutor->email_para_pagos ?? null;

            $phone = $tutor->telefono_movil ?? $tutor->telefono_fijo ?? null;
            if ($phone) {
                $phone = preg_replace('/[^0-9]/', '', $phone);
                if (strlen($phone) >= 9) {
                    $payer['phone'] = [
                        'area_code' => substr($phone, 0, 2),
                        'number' => (int) substr($phone, 2),
                    ];
                }
            }
        } elseif ($payment->patient_id && $patient = $payment->patient) {
            $payer['name'] = $patient->name ?? null;
            $payer['email'] = $patient->tutor_email ?? null;

            $phone = $patient->tutor_phone ?? null;
            if ($phone) {
                $phone = preg_replace('/[^0-9]/', '', $phone);
                if (strlen($phone) >= 9) {
                    $payer['phone'] = [
                        'area_code' => substr($phone, 0, 2),
                        'number' => (int) substr($phone, 2),
                    ];
                }
            }
        }

        return array_filter($payer, fn ($v) => $v !== null && $v !== []);
    }
}
