<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pago pendiente - ConnyVet</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px; }
        .card { background: #f8fafc; border-radius: 12px; padding: 24px; margin: 20px 0; }
        .btn { display: inline-block; background: #0ea5e9; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
        .btn:hover { background: #0284c7; }
        .meta { color: #64748b; font-size: 14px; }
        .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; }
    </style>
</head>
<body>
    <p>Hola,</p>

    <p>Le informamos que tiene un pago pendiente en <strong>ConnyVet</strong>.</p>

    <div class="card">
        <p><strong>Concepto:</strong> {{ $payment->concept }}</p>
        <p><strong>Mascota:</strong> {{ $patientName }}</p>
        <p><strong>Monto:</strong> {{ $amountFormatted }}</p>
    </div>

    <p>Puede realizar el pago de forma segura con tarjeta o transferencia a través de Mercado Pago:</p>

    <p>
        <a href="{{ $paymentLink }}" class="btn">Pagar ahora</a>
    </p>

    <p class="meta">Si el botón no funciona, copie este enlace en su navegador:<br>
        <a href="{{ $paymentLink }}">{{ $paymentLink }}</a>
    </p>

    <p class="footer">Saludos,<br>Equipo ConnyVet</p>
</body>
</html>
