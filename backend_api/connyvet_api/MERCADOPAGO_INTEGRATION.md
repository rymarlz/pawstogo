# Integración de MercadoPago

Esta documentación describe la integración profesional de MercadoPago en el sistema ConnyVet.

## 📋 Índice

1. [Arquitectura](#arquitectura)
2. [Configuración](#configuración)
3. [Uso](#uso)
4. [Flujo de Pago](#flujo-de-pago)
5. [Webhooks](#webhooks)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🏗️ Arquitectura

La integración sigue el patrón **Strategy** y **Factory** ya implementado en el sistema:

```
PaymentProvider (Interface)
    ├── ManualPaymentProvider
    ├── WebpayPlusProvider
    └── MercadoPagoProvider ← Nueva implementación
```

### Componentes principales:

1. **MercadoPagoProvider** (`app/Services/Payments/MercadoPagoProvider.php`)
   - Implementa `PaymentProvider` interface
   - Maneja creación de preferencias y procesamiento de pagos
   - Gestiona conversión de montos (centavos ↔ decimal)

2. **MercadoPagoWebhookController** (`app/Http/Controllers/Api/V1/MercadoPagoWebhookController.php`)
   - Maneja webhooks (notificaciones automáticas)
   - Maneja callbacks (retorno del usuario)

3. **PaymentProviderFactory**
   - Actualizado para incluir `mercadopago`

---

## ⚙️ Configuración

### 1. Instalar dependencias

```bash
cd backend_api/connyvet_api
composer require mercadopago/dx-php
composer install
```

### 2. Configurar variables de entorno

Agrega estas variables a tu archivo `.env`:

```env
# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx
MERCADOPAGO_ENVIRONMENT=sandbox
```

**Para producción:**
- Obtén tus credenciales desde: https://www.mercadopago.com.mx/developers/panel/credentials
- Cambia `MERCADOPAGO_ENVIRONMENT=production`
- Usa tus Access Token y Public Key de producción

### 3. Verificar configuración

La configuración se lee desde `config/services.php`:

```php
'mercadopago' => [
    'access_token' => env('MERCADOPAGO_ACCESS_TOKEN'),
    'public_key' => env('MERCADOPAGO_PUBLIC_KEY'),
    'environment' => env('MERCADOPAGO_ENVIRONMENT', 'sandbox'),
],
```

---

## 🚀 Uso

### Crear un Payment Intent con MercadoPago

```http
POST /api/v1/payment-intents
Authorization: Bearer {token}
Content-Type: application/json

{
  "patient_id": 1,
  "tutor_id": 1,
  "consultation_id": 5,
  "amount_total": 50000,  // En centavos (500.00 CLP)
  "currency": "CLP",
  "provider": "mercadopago",
  "title": "Consulta veterinaria",
  "description": "Pago de consulta #123",
  "meta": {
    "return_url": "https://tu-dominio.com/dashboard/pagos/1",
    "redirect_url": "https://tu-dominio.com/dashboard/pagos/1"
  }
}
```

**Respuesta:**

```json
{
  "data": {
    "id": 1,
    "patient_id": 1,
    "tutor_id": 1,
    "amount_total": 50000,
    "currency": "CLP",
    "status": "pending",
    "provider": "mercadopago",
    "transactions": [
      {
        "id": 1,
        "provider": "mercadopago",
        "status": "initiated",
        "external_id": "1234567890",
        "redirect_url": "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=..."
      }
    ]
  },
  "transaction": {
    "id": 1,
    "redirect_url": "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=..."
  }
}
```

### Iniciar un pago existente

```http
POST /api/v1/payment-intents/{id}/start
Authorization: Bearer {token}
Content-Type: application/json

{
  "provider": "mercadopago",
  "return_url": "https://tu-dominio.com/dashboard/pagos/1"
}
```

---

## 🔄 Flujo de Pago

### 1. Crear Payment Intent

El frontend crea un `PaymentIntent` con `provider: "mercadopago"`.

### 2. Iniciar Pago

El backend crea una preferencia en MercadoPago y retorna `redirect_url`.

### 3. Redirigir al Usuario

El frontend redirige al usuario a `redirect_url` (checkout de MercadoPago).

### 4. Usuario Completa el Pago

El usuario completa el pago en MercadoPago.

### 5. Callback

MercadoPago redirige al usuario a:
```
GET /api/v1/payment-intents/{id}/mercadopago/callback?status=approved&payment_id=...
```

El controller procesa el pago y redirige al frontend.

### 6. Webhook (Paralelo)

MercadoPago también envía un webhook:
```
POST /api/v1/payment-intents/{id}/mercadopago/webhook
```

Este es el método más confiable para actualizar el estado del pago.

---

## 📡 Webhooks

### Configurar Webhook en MercadoPago

1. Ve a: https://www.mercadopago.com.mx/developers/panel/app/{tu-app-id}/webhooks
2. Agrega la URL: `https://tu-dominio.com/api/v1/payment-intents/{id}/mercadopago/webhook`
3. Selecciona eventos: `payment`

**Nota:** En producción, MercadoPago requiere que la URL sea HTTPS y accesible públicamente.

### Formato del Webhook

MercadoPago envía:

```json
{
  "type": "payment",
  "data": {
    "id": "1234567890"
  }
}
```

El controller:
1. Valida el payload
2. Obtiene información completa del pago desde MercadoPago
3. Verifica `external_reference` (debe ser `PI-{payment_intent_id}`)
4. Procesa el pago y actualiza `PaymentIntent`

---

## 🧪 Testing

### Sandbox (Desarrollo)

1. Usa credenciales de TEST
2. `MERCADOPAGO_ENVIRONMENT=sandbox`
3. Tarjetas de prueba: https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/additional-content/test-cards

**Tarjetas de prueba comunes:**
- Aprobada: `5031 7557 3453 0604` (CVV: 123)
- Rechazada: `5031 4332 1540 6351` (CVV: 123)

### Producción

1. Cambia a credenciales de producción
2. `MERCADOPAGO_ENVIRONMENT=production`
3. Configura webhook en el panel de MercadoPago

---

## 🔧 Troubleshooting

### Error: "MercadoPago access token no configurado"

**Solución:** Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté en `.env` y ejecuta:
```bash
php artisan config:clear
```

### Error: "External reference mismatch"

**Causa:** El webhook recibido no corresponde al PaymentIntent esperado.

**Solución:** Verifica que el `external_reference` en MercadoPago sea `PI-{id}`.

### El pago no se actualiza automáticamente

**Causas posibles:**
1. Webhook no configurado en MercadoPago
2. URL del webhook no accesible públicamente
3. Firewall bloqueando requests de MercadoPago

**Solución:**
- Verifica logs: `tail -f storage/logs/laravel.log | grep MercadoPago`
- Prueba el webhook manualmente desde el panel de MercadoPago
- Verifica que la URL sea HTTPS en producción

### Montos incorrectos

**Importante:** 
- `PaymentIntent.amount_total` está en **centavos** (ej: 50000 = 500.00 CLP)
- MercadoPago espera **decimal** (ej: 500.00)
- El provider hace la conversión automáticamente

---

## 📝 Notas Importantes

1. **Seguridad:**
   - Los webhooks son públicos (sin auth) pero validados
   - Siempre verifica `external_reference` antes de procesar
   - Usa HTTPS en producción

2. **Idempotencia:**
   - El sistema maneja múltiples webhooks del mismo pago
   - Las transacciones se actualizan, no se duplican

3. **Monedas Soportadas:**
   - CLP (Chile)
   - USD, ARS, BRL, MXN
   - Ver método `mapCurrency()` para más detalles

4. **Logging:**
   - Todos los eventos se loguean en `storage/logs/laravel.log`
   - Busca por "MercadoPago" para filtrar

---

## 🔗 Referencias

- [SDK de MercadoPago PHP](https://github.com/mercadopago/sdk-php)
- [Documentación de Preferencias](https://www.mercadopago.com.mx/developers/es/reference/preferences/_checkout_preferences/post)
- [Documentación de Webhooks](https://www.mercadopago.com.mx/developers/es/docs/your-integrations/notifications/webhooks)

---

## ✅ Checklist de Implementación

- [ ] Instalar SDK: `composer require mercadopago/dx-php`
- [ ] Configurar variables en `.env`
- [ ] Probar en sandbox
- [ ] Configurar webhook en MercadoPago
- [ ] Probar webhook con pago real
- [ ] Cambiar a producción cuando esté listo
- [ ] Configurar webhook de producción
- [ ] Monitorear logs en producción

---

**Última actualización:** 2026-01-29
