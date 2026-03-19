<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Diagnóstico de configuración MercadoPago.
 * Ejecutar: php artisan mercadopago:diagnostic
 */
class MercadoPagoDiagnosticCommand extends Command
{
    protected $signature = 'mercadopago:diagnostic';

    protected $description = 'Muestra configuración MercadoPago y variables relevantes (sin exponer tokens completos)';

    public function handle(): int
    {
        $token = config('services.mercadopago.access_token');
        $env = config('services.mercadopago.environment');
        $appUrl = config('app.url');
        $frontendUrl = config('app.frontend_url');

        $this->table(
            ['Variable', 'Valor'],
            [
                ['MERCADOPAGO_ACCESS_TOKEN', $token ? substr($token, 0, 20) . '...' : '(vacío)'],
                ['MERCADOPAGO_ENVIRONMENT', $env ?: '(vacío)'],
                ['APP_URL', $appUrl],
                ['APP_FRONTEND_URL', $frontendUrl],
                ['Token tipo', $token && str_starts_with($token, 'TEST-') ? 'TEST (sandbox)' : ($token ? 'Producción (APP_USR-...)' : 'N/A')],
            ]
        );

        if (empty($token)) {
            $this->error('MERCADOPAGO_ACCESS_TOKEN no configurado.');
            return 1;
        }

        if ($env !== 'production' && !str_starts_with($token, 'TEST-')) {
            $this->warn('Advertencia: MERCADOPAGO_ENVIRONMENT=' . $env . ' pero el token parece de producción (APP_USR-). Para sandbox usa un token TEST-.');
        }

        if (str_starts_with($appUrl, 'http://127.0.0.1') || str_starts_with($appUrl, 'http://localhost')) {
            $this->warn('APP_URL es localhost. notification_url y back_urls usarán HTTP. MercadoPago puede rechazar HTTP en producción.');
        }

        $this->info('Diagnóstico completado. Revisa storage/logs/laravel.log al crear una preferencia para ver payload y respuesta.');
        return 0;
    }
}
