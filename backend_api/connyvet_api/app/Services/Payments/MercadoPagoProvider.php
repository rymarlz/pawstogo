<?php

namespace App\Services\Payments;

use App\Models\Payment;
use App\Models\PaymentIntent;
use App\Models\PaymentTransaction;
use Illuminate\Support\Facades\Log;

/**
 * MercadoPago Payment Provider
 * 
 * Implementación profesional del proveedor de pagos MercadoPago
 * siguiendo las mejores prácticas y la arquitectura existente.
 * 
 * @requires mercadopago/dx-php package installed via composer
 * 
 * @note Los errores de tipo "Undefined type" del IDE son esperados
 *       hasta que se instale el SDK con: composer require mercadopago/dx-php
 */
class MercadoPagoProvider implements PaymentProvider
{
    /** @var object */
    private $preferenceClient;
    
    private string $accessToken;
    private string $environment;

    public function __construct()
    {
        $this->accessToken = config('services.mercadopago.access_token');
        $this->environment = config('services.mercadopago.environment', 'sandbox');

        if (empty($this->accessToken)) {
            throw new \RuntimeException('MercadoPago access token no configurado. Verifica MERCADOPAGO_ACCESS_TOKEN en .env');
        }

        // Configurar SDK de MercadoPago (clase como string evita "Undefined type" sin SDK instalado)
        $mpConfig = 'MercadoPago\MercadoPagoConfig';
        $mpConfig::setAccessToken($this->accessToken);
        $mpConfig::setRuntimeEnviroment(
            $this->environment === 'production' ? 'production' : 'local'
        );

        // Instanciar usando nombre de clase como string para evitar "Undefined type" sin SDK instalado
        $preferenceClientClass = 'MercadoPago\Client\Preference\PreferenceClient';
        $this->preferenceClient = new $preferenceClientClass();
    }

    /**
     * Inicia un pago creando una preferencia en MercadoPago
     * 
     * @param PaymentIntent $intent
     * @param array $context ['return_url', 'redirect_url', 'origin']
     * @return PaymentTransaction
     */
    public function start(PaymentIntent $intent, array $context = []): PaymentTransaction
    {
        try {
            // Construir URL de retorno
            $appUrl = rtrim(config('app.url'), '/');
            $returnUrl = $context['return_url'] ?? "{$appUrl}/api/v1/payment-intents/{$intent->id}/mercadopago/callback";
            $redirectUrl = $context['redirect_url'] ?? "{$appUrl}/dashboard/pagos/{$intent->id}";

            // Crear preferencia en MercadoPago
            // Nota: amount_total está en centavos, MercadoPago espera decimal
            $amountDecimal = $intent->amount_total / 100;
            $currencyId = $this->mapCurrency($intent->currency);

            $payer = $this->buildPayerData($intent);
            $notificationUrl = $this->buildWebhookUrl($intent->id);

            // Payload según API oficial: items, payer, back_urls, notification_url, external_reference, auto_return
            // NO incluir metadata: no está en la API oficial de preferencias
            $preferenceData = [
                'items' => [
                    [
                        'title' => $intent->title ?? 'Pago de consulta veterinaria',
                        'description' => (string) ($intent->description ?? "Pago #{$intent->id}"),
                        'quantity' => 1,
                        'currency_id' => $currencyId,
                        'unit_price' => (float) $amountDecimal,
                    ],
                ],
                'payer' => $payer,
                'back_urls' => [
                    'success' => $returnUrl . '?status=approved',
                    'failure' => $returnUrl . '?status=rejected',
                    'pending' => $returnUrl . '?status=pending',
                ],
                'auto_return' => 'approved',
                'external_reference' => "PI-{$intent->id}",
                'notification_url' => $notificationUrl,
                'statement_descriptor' => substr(config('app.name', 'ConnyVet'), 0, 13),
            ];

            // En sandbox, notification_url con HTTP localhost puede ser rechazada: omitir si es local
            if ($this->environment !== 'production' && (str_starts_with($notificationUrl, 'http://127.0.0.1') || str_starts_with($notificationUrl, 'http://localhost'))) {
                unset($preferenceData['notification_url']);
                Log::warning('MercadoPago: notification_url omitida en sandbox (localhost no accesible para MP)', [
                    'payment_intent_id' => $intent->id,
                    'url_omitida' => $notificationUrl,
                ]);
            }

            // Log payload enviado (sin credenciales)
            Log::info('MercadoPago: enviando preferencia', [
                'payment_intent_id' => $intent->id,
                'environment' => $this->environment,
                'access_token_prefix' => substr($this->accessToken, 0, 15) . '...',
                'payload' => $preferenceData,
            ]);

            // Crear preferencia
            $preference = $this->preferenceClient->create($preferenceData);

            // En sandbox/test, Mercado Pago devuelve sandbox_init_point; en producción, init_point
            $checkoutUrl = ($this->environment === 'production')
                ? ($preference->init_point ?? $preference->sandbox_init_point ?? null)
                : ($preference->sandbox_init_point ?? $preference->init_point ?? null);

            if (empty($checkoutUrl)) {
                throw new \RuntimeException('MercadoPago no devolvió URL de checkout (init_point ni sandbox_init_point).');
            }

            // Crear transacción en nuestra BD
            $tx = PaymentTransaction::create([
                'payment_intent_id' => $intent->id,
                'provider' => 'mercadopago',
                'status' => 'initiated',
                'amount' => $intent->amount_total,
                'currency' => $intent->currency,
                'external_id' => $preference->id,
                'redirect_url' => $checkoutUrl,
                'return_url' => $returnUrl,
                'request_payload' => [
                    'preference_data' => $preferenceData,
                    'context' => $context,
                ],
                'response_payload' => [
                    'preference_id' => $preference->id,
                    'init_point' => $preference->init_point,
                    'sandbox_init_point' => $preference->sandbox_init_point ?? null,
                    'checkout_url' => $checkoutUrl,
                ],
            ]);

            // Actualizar estado del intent
            $intent->status = 'pending';
            $intent->provider = 'mercadopago';
            $intent->save();

            Log::info('MercadoPago preference created', [
                'payment_intent_id' => $intent->id,
                'preference_id' => $preference->id,
                'init_point' => $preference->init_point,
            ]);

            return $tx;

        } catch (\Exception $e) {
            $mpExceptionClass = 'MercadoPago\Exceptions\MPApiException';
            if ($e instanceof $mpExceptionClass) {
                $apiResponse = $e->getApiResponse();
                $statusCode = $apiResponse?->getStatusCode() ?? 0;
                $content = $apiResponse?->getContent();
                $contentJson = is_array($content) ? json_encode($content, JSON_UNESCAPED_UNICODE) : (string) $content;

                // Extraer mensaje real de la API (MercadoPago devuelve message, error, cause)
                $apiMessage = $content['message'] ?? $content['error'] ?? null;
                $apiCause = $content['cause'] ?? null;
                $detail = $apiMessage ?? $e->getMessage();
                if (is_array($apiCause) && !empty($apiCause)) {
                    $detail .= ' | cause: ' . json_encode($apiCause, JSON_UNESCAPED_UNICODE);
                }

                Log::error('MercadoPago API error', [
                    'payment_intent_id' => $intent->id,
                    'exception_message' => $e->getMessage(),
                    'status_code' => $statusCode,
                    'response_body' => $contentJson,
                    'api_message' => $apiMessage,
                    'api_cause' => $apiCause,
                ]);

                throw new \RuntimeException("Error al crear preferencia en MercadoPago: {$detail}", 0, $e);
            }
            Log::error('MercadoPago unexpected error', [
                'payment_intent_id' => $intent->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw new \RuntimeException("Error inesperado en MercadoPago: {$e->getMessage()}", 0, $e);
        }
    }

    /**
     * Procesa el callback/webhook de MercadoPago
     * 
     * @param array $callbackPayload Datos del webhook/callback
     * @return PaymentTransaction
     */
    public function commit(array $callbackPayload): PaymentTransaction
    {
        try {
            $paymentId = $callbackPayload['data']['id'] ?? $callbackPayload['id'] ?? null;
            $externalReference = $callbackPayload['external_reference'] ?? null;

            if (!$paymentId) {
                throw new \InvalidArgumentException('Payment ID no encontrado en el callback');
            }

            // Extraer payment_intent_id del external_reference (formato: PI-{id})
            $intentId = null;
            if ($externalReference && preg_match('/^PI-(\d+)$/', $externalReference, $matches)) {
                $intentId = (int) $matches[1];
            }

            if (!$intentId) {
                throw new \InvalidArgumentException("External reference inválido: {$externalReference}");
            }

            $intent = PaymentIntent::findOrFail($intentId);

            // Obtener información del pago desde MercadoPago (clase como string evita "Undefined type")
            $paymentClientClass = 'MercadoPago\Client\Payment\PaymentClient';
            $paymentClient = new $paymentClientClass();
            $payment = $paymentClient->get($paymentId);

            // Buscar o crear transacción
            $tx = PaymentTransaction::where('payment_intent_id', $intentId)
                ->where('external_id', $paymentId)
                ->first();

            if (!$tx) {
                // Si no existe, buscar por preference_id
                $tx = PaymentTransaction::where('payment_intent_id', $intentId)
                    ->where('provider', 'mercadopago')
                    ->where('status', 'initiated')
                    ->latest()
                    ->first();
            }

            if (!$tx) {
                // Crear nueva transacción si no existe
                // MercadoPago devuelve el monto en decimal, convertimos a centavos
                $amountInCents = (int) round($payment->transaction_amount * 100);
                
                $tx = PaymentTransaction::create([
                    'payment_intent_id' => $intentId,
                    'provider' => 'mercadopago',
                    'status' => $this->mapMercadoPagoStatus($payment->status),
                    'amount' => $amountInCents,
                    'currency' => $payment->currency_id,
                    'external_id' => $payment->id,
                    'authorization_code' => $payment->authorization_code ?? null,
                    'response_payload' => [
                        'payment_data' => [
                            'id' => $payment->id,
                            'status' => $payment->status,
                            'status_detail' => $payment->status_detail,
                            'transaction_amount' => $payment->transaction_amount,
                            'currency_id' => $payment->currency_id,
                            'payment_method_id' => $payment->payment_method_id,
                            'payment_type_id' => $payment->payment_type_id,
                            'date_approved' => $payment->date_approved,
                            'date_created' => $payment->date_created,
                        ],
                        'callback_payload' => $callbackPayload,
                    ],
                ]);
            } else {
                // Actualizar transacción existente
                $tx->status = $this->mapMercadoPagoStatus($payment->status);
                $tx->external_id = $payment->id;
                $tx->authorization_code = $payment->authorization_code ?? null;
                $tx->response_payload = array_merge($tx->response_payload ?? [], [
                    'payment_data' => [
                        'id' => $payment->id,
                        'status' => $payment->status,
                        'status_detail' => $payment->status_detail,
                        'transaction_amount' => $payment->transaction_amount,
                        'currency_id' => $payment->currency_id,
                        'payment_method_id' => $payment->payment_method_id,
                        'payment_type_id' => $payment->payment_type_id,
                        'date_approved' => $payment->date_approved,
                        'date_created' => $payment->date_created,
                    ],
                    'callback_payload' => $callbackPayload,
                ]);
                $tx->save();
            }

            // Actualizar estado del PaymentIntent según el estado del pago
            $this->updatePaymentIntentStatus($intent, $payment, $tx);

            Log::info('MercadoPago payment processed', [
                'payment_intent_id' => $intentId,
                'payment_id' => $paymentId,
                'status' => $payment->status,
                'transaction_status' => $tx->status,
            ]);

            return $tx;

        } catch (\Exception $e) {
            // Verificar si es una excepción de MercadoPago API
            $mpExceptionClass = 'MercadoPago\Exceptions\MPApiException';
            if ($e instanceof $mpExceptionClass) {
                $apiResponse = $e->getApiResponse();
                Log::error('MercadoPago API error en commit', [
                    'callback_payload' => $callbackPayload,
                    'error' => $e->getMessage(),
                    'status' => $apiResponse?->getStatusCode(),
                    'content' => $apiResponse?->getContent(),
                ]);

                throw new \RuntimeException("Error al procesar pago en MercadoPago: {$e->getMessage()}", 0, $e);
            }
            Log::error('MercadoPago unexpected error en commit', [
                'callback_payload' => $callbackPayload,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw new \RuntimeException("Error inesperado al procesar pago: {$e->getMessage()}", 0, $e);
        }
    }

    /**
     * Mapea el estado de MercadoPago al estado interno
     */
    private function mapMercadoPagoStatus(string $mpStatus): string
    {
        return match ($mpStatus) {
            'approved' => 'paid',
            'rejected', 'cancelled', 'refunded', 'charged_back' => 'failed',
            'pending', 'in_process', 'in_mediation' => 'pending',
            default => 'pending',
        };
    }

    /**
     * Actualiza el estado del PaymentIntent según el pago de MercadoPago
     */
    private function updatePaymentIntentStatus(PaymentIntent $intent, $payment, PaymentTransaction $tx): void
    {
        // MercadoPago devuelve el monto en decimal, convertimos a centavos
        $amountPaid = (int) round($payment->transaction_amount * 100);

        switch ($payment->status) {
            case 'approved':
                $intent->markPaid($amountPaid, [
                    'mercadopago_payment_id' => $payment->id,
                    'mercadopago_status' => $payment->status,
                    'mercadopago_status_detail' => $payment->status_detail,
                    'mercadopago_payment_method' => $payment->payment_method_id,
                    'mercadopago_date_approved' => $payment->date_approved,
                ]);
                $this->syncPaymentFromIntent($intent);
                break;

            case 'rejected':
            case 'cancelled':
            case 'refunded':
            case 'charged_back':
                $intent->markFailed([
                    'mercadopago_payment_id' => $payment->id,
                    'mercadopago_status' => $payment->status,
                    'mercadopago_status_detail' => $payment->status_detail,
                ]);
                break;

            case 'pending':
            case 'in_process':
            case 'in_mediation':
                // Mantener como pending
                break;
        }
    }

    /**
     * Crea un registro en payments (caja) cuando el PaymentIntent queda pagado por Mercado Pago.
     * Idempotente: no crea duplicado si ya existe un payment con este payment_intent_id.
     */
    private function syncPaymentFromIntent(PaymentIntent $intent): void
    {
        $intent->refresh();

        if (Payment::where('payment_intent_id', $intent->id)->exists()) {
            return;
        }

        // amount_paid en intent está en centavos; payments.amount es en unidades (pesos)
        $amountInUnits = $intent->amount_paid > 0
            ? round($intent->amount_paid / 100, 2)
            : round($intent->amount_total / 100, 2);

        Payment::create([
            'patient_id'          => $intent->patient_id,
            'tutor_id'            => $intent->tutor_id,
            'consultation_id'     => $intent->consultation_id,
            'payment_intent_id'   => $intent->id,
            'concept'             => $intent->title ?? 'Pago online (Mercado Pago)',
            'amount'              => $amountInUnits,
            'status'              => 'paid',
            'method'              => 'mercadopago',
            'notes'               => null,
            'paid_at'             => now(),
            'created_by'          => null,
        ]);

        Log::info('Payment created from PaymentIntent', [
            'payment_intent_id' => $intent->id,
            'amount' => $amountInUnits,
        ]);
    }

    /**
     * Construye datos del pagador desde el PaymentIntent.
     * MercadoPago rechaza phone con area_code null: solo incluir phone si es válido.
     */
    private function buildPayerData(PaymentIntent $intent): array
    {
        $payer = [];

        if (!$intent->relationLoaded('tutor')) {
            $intent->load('tutor');
        }
        if (!$intent->relationLoaded('patient')) {
            $intent->load('patient');
        }

        if ($intent->tutor_id && $tutor = $intent->tutor) {
            $payer['name'] = $tutor->nombres ?? null;
            $payer['surname'] = $tutor->apellidos ?? null;
            $payer['email'] = $tutor->email ?? null;

            $phone = $tutor->telefono_movil ?? $tutor->telefono_fijo ?? null;
            if ($phone) {
                $phone = preg_replace('/[^0-9]/', '', $phone);
                if (strlen($phone) >= 9) {
                    $payer['phone'] = [
                        'area_code' => substr($phone, 0, 2),
                        'number' => (int) substr($phone, 2),
                    ];
                }
                // No enviar phone si area_code sería null: MercadoPago lo rechaza
            }
        } elseif ($intent->patient_id && $patient = $intent->patient) {
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

        return array_filter($payer, fn ($value) => $value !== null && $value !== []);
    }

    /**
     * Mapea la moneda a formato de MercadoPago
     */
    private function mapCurrency(string $currency): string
    {
        return match (strtoupper($currency)) {
            'CLP' => 'CLP',
            'USD' => 'USD',
            'ARS' => 'ARS',
            'BRL' => 'BRL',
            'MXN' => 'MXN',
            default => 'CLP',
        };
    }

    /**
     * Construye la URL del webhook
     */
    private function buildWebhookUrl(int $intentId): string
    {
        $appUrl = config('app.url');
        return "{$appUrl}/api/v1/payment-intents/{$intentId}/mercadopago/webhook";
    }
}
