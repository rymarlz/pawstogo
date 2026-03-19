# Flujo de pagos end-to-end — ConnyVet

## Resumen del flujo

1. **Crear pago** → Admin crea pago con paciente, concepto y monto.
2. **Generar link** → Backend crea preferencia en Mercado Pago, guarda `payment_link`, `mp_preference_id`, `external_reference`.
3. **Enviar correo** → Si el tutor tiene email, se envía el link. Se registra `email_sent_at` o `email_error`.
4. **Mostrar en frontend** → Estado del pago, estado del correo, link, botones copiar/reenviar.
5. **Callback/Webhook** → Mercado Pago notifica el resultado. El callback sincroniza si el usuario vuelve con `payment_id`.
6. **Actualizar estado** → `status` (pending/paid/cancelled), `mercadopago_status`, `mercadopago_status_detail`.
7. **Frontend** → Banners según estado: pagado (verde), pendiente (amarillo), correo fallido (rojo), sin email tutor (ámbar).

---

## Campos nuevos en `payments`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `email_sent_at` | timestamp | Cuándo se envió el correo correctamente |
| `email_error` | text | Mensaje de error si el correo falló |
| `mercadopago_status` | string | Estado de MP: approved, pending, rejected, etc. |
| `mercadopago_status_detail` | string | Detalle de MP: accredited, pending_contingency, etc. |

---

## Endpoints

### Test SMTP

- **GET** `/api/v1/test-smtp?email=destino@ejemplo.com`
- Requiere autenticación y permiso `viewAny` en Payment.
- Envía un correo de prueba.

### Comando Artisan

```bash
php artisan mail:test tu@correo.com
```

---

## Pasos para probar localmente

### 1. Backend

```bash
cd backend_api/connyvet_api
cp .env.example .env
# Configurar: DB_*, MAIL_*, MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_ENVIRONMENT
# APP_URL=http://127.0.0.1:8000
# FRONTEND_URL=http://localhost:5173 (o el puerto de Vite)

php artisan migrate
php artisan serve
```

### 2. Probar SMTP

```bash
php artisan mail:test tu@correo.com
# O: curl -H "Authorization: Bearer TOKEN" "http://127.0.0.1:8000/api/v1/test-smtp?email=tu@correo.com"
```

### 3. Frontend

```bash
cd front/connyvet-frontend
npm run dev
```

### 4. Flujo completo

1. Iniciar sesión como admin/doctor.
2. Ir a **Pagos** → **Crear pago**.
3. Seleccionar paciente (con tutor que tenga email), concepto, monto.
4. Crear → Ver detalle.
5. Verificar:
   - Banner "Pago pendiente" (amarillo).
   - Estado del correo: "Enviado [fecha]" o "Falló" o "Sin email del tutor".
   - Botón "Pagar con Mercado Pago" → abre el checkout de MP.
6. En sandbox, completar pago con tarjetas de prueba de Mercado Pago.
7. MP redirige a `/dashboard/pagos/{id}?mp_status=approved`.
8. El callback sincroniza el estado (o el webhook si está configurado).
9. Ver banner verde "Pago confirmado".

### 5. Tutor sin email

- Crear pago con paciente cuyo tutor no tiene email.
- Ver banner ámbar "El tutor no tiene correo configurado".
- Copiar link y enviar manualmente.

---

## Producción

- Configurar `MERCADOPAGO_WEBHOOK_SECRET` para validar webhooks.
- Usar `MERCADOPAGO_ACCESS_TOKEN` de producción (APP_USR-...).
- `APP_URL` y `FRONTEND_URL` deben ser HTTPS.
- El webhook debe ser accesible desde internet (ngrok en desarrollo).
