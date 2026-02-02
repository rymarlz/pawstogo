# 🚀 Guía Rápida de Configuración - MercadoPago

## Pasos para Activar MercadoPago

### 1. Instalar SDK

```bash
cd backend_api/connyvet_api
composer require mercadopago/dx-php
composer install
```

### 2. Configurar Variables de Entorno

Edita `.env` y agrega:

```env
# MercadoPago
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx
MERCADOPAGO_PUBLIC_KEY=TEST-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxx
MERCADOPAGO_ENVIRONMENT=sandbox
```

**Obtener credenciales:**
- Sandbox: https://www.mercadopago.com.mx/developers/panel/app
- Producción: https://www.mercadopago.com.mx/developers/panel/credentials

### 3. Limpiar Cache

```bash
php artisan config:clear
php artisan cache:clear
```

### 4. Probar en Sandbox

1. Crea un PaymentIntent con `provider: "mercadopago"`
2. Obtén el `redirect_url` de la respuesta
3. Redirige al usuario a esa URL
4. Usa tarjetas de prueba (ver documentación completa)

### 5. Configurar Webhook (Producción)

1. Ve a: https://www.mercadopago.com.mx/developers/panel/app/{app-id}/webhooks
2. URL: `https://tu-dominio.com/api/v1/payment-intents/{id}/mercadopago/webhook`
3. Eventos: `payment`

---

## ✅ Checklist

- [ ] SDK instalado (`composer require mercadopago/dx-php`)
- [ ] Variables configuradas en `.env`
- [ ] Cache limpiado
- [ ] Probado en sandbox
- [ ] Webhook configurado (producción)
- [ ] Cambiado a producción cuando esté listo

---

**Para más detalles, ver:** `MERCADOPAGO_INTEGRATION.md`
