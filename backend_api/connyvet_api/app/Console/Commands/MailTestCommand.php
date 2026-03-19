<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Envía un correo de prueba para verificar SMTP.
 * Ejecutar: php artisan mail:test [email@ejemplo.com]
 */
class MailTestCommand extends Command
{
    protected $signature = 'mail:test {email? : Email destino (opcional, usa MAIL_FROM_ADDRESS si no se indica)}';

    protected $description = 'Envía un correo de prueba para verificar la configuración SMTP';

    public function handle(): int
    {
        $email = $this->argument('email') ?: config('mail.from.address');

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Email inválido. Usa: php artisan mail:test tu@correo.com');
            return 1;
        }

        $this->info("Enviando correo de prueba a {$email}...");

        try {
            Mail::raw(
                "Correo de prueba desde ConnyVet.\n\nEnviado: " . now()->toIso8601String() . "\n\nSi recibiste esto, el SMTP está configurado correctamente.",
                function ($message) use ($email) {
                    $message->to($email)
                        ->subject('Prueba SMTP - ConnyVet');
                }
            );

            $this->info("Correo enviado correctamente a {$email}");
            return 0;
        } catch (\Throwable $e) {
            $this->error('Error: ' . $e->getMessage());
            return 1;
        }
    }
}
