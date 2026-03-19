# Flujo de pagos por email con Mercado Pago

## Resumen

Al crear un pago pendiente desde el panel, el sistema:
1. Genera un link de pago de Mercado Pago
2. Guarda el link en la entidad `Payment`
3. Envía un correo al tutor con el link
4. El webhook actualiza el estado cuando Mercado Pago confirma

## Archivos modificados/creados

| Archivo | Descripción |
|---------|-------------|
| `database/migrations/2026_03_17_000000_add_mercadopago_fields_to_payments_table.php` | Nuevos campos: payment_link, mp_preference_id, external_reference |
| `app/Services/PaymentLinkService.php` | Servicio que crea preferencia MP para Payment |
| `app/Mail/PaymentLinkMail.php` | Mailable con link de pago |
| `resources/views/emails/payment-link.blade.php` | Vista del correo |
| `app/Http/Controllers/Api/PaymentController.php` | store: genera link y envía email; resendLink |
| `app/Http/Controllers/Api/V1/MercadoPagoPaymentWebhookController.php` | Webhook genérico P-{id} y PI-{id} |
| `app/Http/Controllers/Api/V1/MercadoPagoPaymentCallbackController.php` | Callback cuando el usuario retorna de MP |
| `app/Models/Payment.php` | Nuevos fillable |
| `routes/api.php` | Rutas webhook, callback, resend-link |
| `tests/Feature/PaymentLinkFlowTest.php` | Tests del flujo |
| `tests/Feature/MercadoPagoWebhookTest.php` | Tests del webhook |

## Migración

```bash
php artisan migrate
```

## Campos nuevos en `payments`

- `payment_link` (string, nullable): URL de checkout de Mercado Pago
- `mp_preference_id` (string, nullable): ID de la preferencia en MP
- `external_reference` (string, nullable): Formato `P-{payment_id}` para vincular con MP

## Flujo

### 1. Crear pago (POST /api/v1/payments)

**Payload:**
```json
{
  "patient_id": 1,
  "tutor_id": 1,
  "concept": "Consulta veterinaria",
  "amount": 25000,
  "status": "pending"
}
```

**Respuesta exitosa (201):**
```json
{
  "data": {
    "id": 1,
    "patient_id": 1,
    "tutor_id": 1,
    "concept": "Consulta veterinaria",
    "amount": 25000,
    "status": "pending",
    "payment_link": "https://www.mercadopago.cl/checkout/v1/redirect?pref_id=...",
    "mp_preference_id": "1234567890-abc...",
    "external_reference": "P-1"
  },
  "message": "Pago creado. Link enviado al tutor por correo."
}
```

**Si tutor sin email:**
```json
{
  "data": { ... },
  "message": "Pago creado. Link generado. No se envió email: el tutor no tiene correo configurado."
}
```

### 2. Reenviar link (POST /api/v1/payments/{id}/resend-link)

**Respuesta (200):**
```json
{
  "message": "Link de pago reenviado correctamente.",
  "data": { ... }
}
```

### 3. Webhook Mercado Pago (POST /api/v1/mercadopago/webhook)

**URL a configurar en Mercado Pago:** `https://tu-dominio.com/api/v1/mercadopago/webhook`

**Payload que envía MP:**
```json
{
  "type": "payment",
  "data": {
    "id": "123456789"
  }
}
```

El controlador obtiene el pago de MP por `data.id`, lee `external_reference` (ej. `P-1`) y actualiza el `Payment` correspondiente.

### 4. Callback (redirección del usuario)

Cuando el usuario paga y MP lo redirige:
`GET /api/v1/mercadopago/payment-callback?ref=P-1&status=approved`

Redirige al frontend: `/dashboard/pagos/1?mp_status=approved`

## Cómo probar

### Local (sin webhook real)

1. Crear pago pendiente desde el frontend o con curl:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/payments \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":1,"tutor_id":1,"concept":"Test","amount":1000,"status":"pending"}'
```

2. Verificar en BD que `payment_link`, `mp_preference_id`, `external_reference` están poblados.

3. Revisar logs: `storage/logs/laravel.log` para ver si se envió el email.

4. Probar reenviar:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/payments/1/resend-link \
  -H "Authorization: Bearer TU_TOKEN"
```

### Con Mercado Pago real

1. Configurar `.env`:
   - `MERCADOPAGO_ACCESS_TOKEN`
   - `MERCADOPAGO_ENVIRONMENT` (sandbox o production)
   - `APP_URL` y `APP_FRONTEND_URL`

2. Para recibir webhooks en local, usar ngrok:
```bash
ngrok http 8000
# Usar la URL de ngrok como APP_URL temporalmente
```

3. En el panel de Mercado Pago, configurar la URL del webhook: `https://tu-ngrok.ngrok.io/api/v1/mercadopago/webhook`

### Tests

```bash
php artisan test tests/Feature/PaymentLinkFlowTest.php tests/Feature/MercadoPagoWebhookTest.php
```

## Compatibilidad

- Pagos con `status: paid` o `cancelled` no generan link ni envían email.
- El flujo de PaymentIntent (pago online desde el panel) sigue funcionando igual.
- `mark-paid` manual sigue disponible para pagos en caja.
