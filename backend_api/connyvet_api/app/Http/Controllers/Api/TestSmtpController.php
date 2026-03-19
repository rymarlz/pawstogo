<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Endpoint para probar envío de correo (SMTP).
 * GET /api/v1/test-smtp?email=destino@ejemplo.com
 */
class TestSmtpController extends Controller
{
    public function __invoke(Request $request)
    {
        $email = $request->query('email', config('mail.from.address'));

        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'ok'    => false,
                'error' => 'Email inválido. Use ?email=tu@correo.com',
            ], 422);
        }

        try {
            Mail::raw(
                "Correo de prueba desde ConnyVet.\n\nEnviado: " . now()->toIso8601String() . "\n\nSi recibiste esto, el SMTP está configurado correctamente.",
                function ($message) use ($email) {
                    $message->to($email)
                        ->subject('Prueba SMTP - ConnyVet');
                }
            );

            Log::info('Test SMTP: correo enviado', ['to' => $email]);

            return response()->json([
                'ok'    => true,
                'message' => "Correo de prueba enviado a {$email}",
            ]);
        } catch (\Throwable $e) {
            Log::error('Test SMTP: error', [
                'to'    => $email,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'ok'    => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}
