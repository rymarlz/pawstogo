# Implementación backend – Integración Mercado Pago ConnyVet

## A. Resumen de cambios backend

1. **Callback y frontend URL**
   - La redirección del callback de Mercado Pago pasa de `/dashboard/pagos/{id}` a `/dashboard/pagos/intento/{id}` para que el frontend muestre el detalle de la intención de pago (payment_intent.id).
   - Se usa `config('app.frontend_url')` con fallback a `config('app.url')`; se documenta `APP_FRONTEND_URL` en `.env.example`.

2. **Configuración**
   - En `config/app.php` se añade la clave `frontend_url`.
   - En `.env.example` se añaden `APP_FRONTEND_URL` y `MERCADOPAGO_WEBHOOK_SECRET`.

3. **Policy para PaymentIntent**
   - Nueva `PaymentIntentPolicy` con `viewAny`, `view` y `create` (mismos roles que pagos: admin, recepcion, vet).
   - Registro en `AuthServiceProvider` y middleware `can:viewAny` / `can:create` en rutas de payment-intents; `authorize('view', $intent)` en show, start, markManualPaid y cancel.

4. **Sincronización PaymentIntent → Payment (opción 2 del diseño)**
   - Migración que añade `payment_intent_id` (nullable, FK a payment_intents) a `payments`.
   - Modelo `Payment`: `payment_intent_id` en fillable y relación `paymentIntent()`.
   - En `MercadoPagoProvider`, al marcar el intent como paid se llama a `syncPaymentFromIntent()`: crea un `Payment` (concepto, monto en pesos, method `mercadopago`, paid_at) de forma idempotente (no crea si ya existe uno con ese `payment_intent_id`).
   - `PaymentController` acepta el método `mercadopago` en store, update y markPaid.

5. **Validaciones**
   - En `PaymentIntentController::start` se rechaza con 409 si el intent está cancelado.
   - En el callback se usa `status` con valor por defecto `'unknown'` para evitar URL con segmento vacío.

No se añaden endpoints nuevos; no se modifica la lógica de webhook más allá de lo ya existente (la idempotencia del commit y la creación de Payment ya cubren webhooks duplicados).

---

## B. Archivos modificados y creados

| Acción   | Ruta |
|----------|------|
| Modificar | `app/Http/Controllers/Api/V1/MercadoPagoWebhookController.php` |
| Modificar | `config/app.php` |
| Modificar | `.env.example` |
| Crear     | `app/Policies/PaymentIntentPolicy.php` |
| Modificar | `app/Providers/AuthServiceProvider.php` |
| Modificar | `routes/api.php` |
| Modificar | `app/Http/Controllers/Api/V1/PaymentIntentController.php` |
| Crear     | `database/migrations/2025_12_30_000000_add_payment_intent_id_to_payments_table.php` |
| Modificar | `app/Models/Payment.php` |
| Modificar | `app/Http/Controllers/Api/PaymentController.php` |
| Modificar | `app/Services/Payments/MercadoPagoProvider.php` |

---

## C. Código completo por archivo

Los cambios ya están aplicados en el repositorio. A continuación se referencian las partes relevantes de cada archivo (no se repite código idéntico al ya existente).

### MercadoPagoWebhookController.php

- **Callback:** Redirección a `$frontendUrl . '/dashboard/pagos/intento/' . $id` con query `status` y `payment_id`. En el `catch` se redirige a la misma ruta con `?status=error`.
- **Query status:** `$status = $request->query('status', 'unknown');` para evitar valores nulos en la URL.

### config/app.php

- Añadido después de `'url'`:
```php
'frontend_url' => env('APP_FRONTEND_URL', env('APP_URL')),
```

### .env.example

- Tras `APP_URL`: `APP_FRONTEND_URL=http://localhost:5173`
- Tras `MERCADOPAGO_ENVIRONMENT`: `MERCADOPAGO_WEBHOOK_SECRET=` con comentario opcional.

### PaymentIntentPolicy.php (nuevo)

- Clase con `canManagePaymentIntents()` (roles admin, recepcion, vet), `viewAny`, `view`, `create`.

### AuthServiceProvider.php

- `$policies`: se registran explícitamente Budget, Payment y PaymentIntent con sus policies.

### routes/api.php

- Rutas de payment-intents: `index` con `->middleware('can:viewAny,App\Models\PaymentIntent')`, `store` con `->middleware('can:create,App\Models\PaymentIntent')`.

### PaymentIntentController.php

- `index`: `$this->authorize('viewAny', PaymentIntent::class);`
- `store`: `$this->authorize('create', PaymentIntent::class);`
- `show`, `start`, `markManualPaid`, `cancel`: `$this->authorize('view', $intent);`
- En `start`: comprobación `if ($intent->status === 'cancelled')` → 409.

### Migración add_payment_intent_id_to_payments_table

- `up`: añade columna `payment_intent_id` nullable, índice y FK a `payment_intents` (con comprobación de tabla y columna).
- `down`: dropForeign y dropColumn con comprobaciones.

### Payment.php

- Fillable: se añade `payment_intent_id`.
- Relación: `paymentIntent()` → `belongsTo(PaymentIntent::class)`.

### PaymentController.php

- En las reglas de validación de `method` (store, update, markPaid): se añade `'mercadopago'` al `Rule::in([...])`.

### MercadoPagoProvider.php

- Import: `use App\Models\Payment;`
- En `updatePaymentIntentStatus`, caso `'approved'`: tras `markPaid` se llama a `$this->syncPaymentFromIntent($intent);`
- Nuevo método `syncPaymentFromIntent(PaymentIntent $intent)`: si ya existe un Payment con ese `payment_intent_id`, return; si no, crea Payment con patient_id, tutor_id, consultation_id, payment_intent_id, concept (title o "Pago online (Mercado Pago)"), amount (amount_paid/100 o amount_total/100), status paid, method mercadopago, paid_at, created_by null. Log de creación.

---

## D. Explicación breve por archivo

- **MercadoPagoWebhookController:** Alinea el callback con la ruta frontend de detalle de intención (`/dashboard/pagos/intento/{id}`) y evita status nulo en la URL.
- **config/app.php:** Permite configurar la URL del SPA para redirecciones (callback).
- **.env.example:** Documenta variables necesarias para producción (frontend URL y webhook secret).
- **PaymentIntentPolicy:** Restringe listado, creación y visualización de intents a roles admin, recepcion y vet.
- **AuthServiceProvider:** Registra las policies de Payment y PaymentIntent de forma explícita.
- **routes/api.php:** Aplica policy en index y store de payment-intents; el resto se autoriza en el controlador.
- **PaymentIntentController:** Autorización en todos los métodos; rechazo de start cuando el intent está cancelado.
- **Migración:** Permite vincular un registro de caja (Payment) con la intención de pago (PaymentIntent) y asegurar idempotencia al crear Payment desde un intent pagado.
- **Payment:** Soporta el origen desde payment_intent y la relación con PaymentIntent.
- **PaymentController:** Acepta método `mercadopago` en creación, actualización y marcar pagado.
- **MercadoPagoProvider:** Tras confirmar el pago con MP, crea un Payment asociado al intent de forma idempotente para unificar caja y reportes.

---

## E. Checklist de pruebas backend

- [ ] **Config:** Definir `APP_FRONTEND_URL` en `.env` (ej. `http://localhost:5173`). En producción, `MERCADOPAGO_WEBHOOK_SECRET` configurado.
- [ ] **Migración:** `php artisan migrate` ejecuta la migración `add_payment_intent_id_to_payments_table` sin error.
- [ ] **Policy:** Usuario sin rol admin/recepcion/vet recibe 403 en GET/POST `/api/v1/payment-intents` y en GET/POST con un intent concreto.
- [ ] **Crear intent:** POST `/api/v1/payment-intents` con body válido (amount_total, patient_id opcional, etc.) devuelve 201 y `data.status` draft.
- [ ] **Start Mercado Pago:** POST `/api/v1/payment-intents/{id}/start` con `provider=mercadopago` devuelve `transaction.redirect_url`; intent en pending.
- [ ] **Start ya pagado:** Mismo request con intent paid devuelve 409.
- [ ] **Start cancelado:** Mismo request con intent cancelled devuelve 409.
- [ ] **Callback:** Simular GET `/api/v1/payment-intents/{id}/mercadopago/callback?status=approved` (o con payment_id si se simula MP); verificar redirección 302 a `{APP_FRONTEND_URL}/dashboard/pagos/intento/{id}?status=...`.
- [ ] **Callback error:** Intent inexistente o excepción; redirección a misma ruta con `?status=error`.
- [ ] **Webhook:** Simular POST al webhook con payload tipo Mercado Pago (type=payment, data.id); con intent existente y external_reference correcto, respuesta 200; intent actualizado a paid; si corresponde, un registro en `payments` con `payment_intent_id` y method mercadopago.
- [ ] **Idempotencia webhook:** Enviar dos veces el mismo webhook; solo un Payment creado para ese payment_intent_id.
- [ ] **Payments:** Crear/actualizar/markPaid un payment con `method=mercadopago` vía API; sin error de validación.
- [ ] **Summary:** GET `/api/v1/payments/summary` incluye montos de payments creados desde intents (method mercadopago).
