# Auditoría técnica del módulo de pagos — ConnyVet

Documento generado tras la auditoría y corrección del módulo de pagos (payments, payment_intents, Mercado Pago).

---

## A. Diagnóstico técnico completo

### A.1 Mapa del backend de pagos

| Componente | Ruta/Ubicación | Responsabilidad |
|------------|----------------|-----------------|
| **PaymentController** | `app/Http/Controllers/Api/PaymentController.php` | CRUD de `payments` (registro de caja), markPaid, cancel, summary |
| **PaymentIntentController** | `app/Http/Controllers/Api/V1/PaymentIntentController.php` | index, show, store, start, markManualPaid, cancel |
| **MercadoPagoWebhookController** | `app/Http/Controllers/Api/V1/MercadoPagoWebhookController.php` | webhook (POST), callback (GET) — rutas públicas |
| **MercadoPagoProvider** | `app/Services/Payments/MercadoPagoProvider.php` | start (crear preferencia MP), commit (procesar webhook/callback), syncPaymentFromIntent |
| **PaymentProviderFactory** | `app/Services/Payments/PaymentProviderFactory.php` | make('manual' \| 'webpay_plus' \| 'mercadopago') |
| **Payment** | `app/Models/Payment.php` | Registro de cobro (caja): patient_id, tutor_id, concept, amount, status, method, payment_intent_id |
| **PaymentIntent** | `app/Models/PaymentIntent.php` | Intención de pago: draft → pending → paid \| failed \| cancelled |
| **PaymentTransaction** | `app/Models/PaymentTransaction.php` | Trazabilidad por intent: external_id, redirect_url, status |

**Rutas API:**
- `GET/POST /api/v1/payments`, `GET/PUT/DELETE /api/v1/payments/{id}`, `POST mark-paid`, `POST cancel`, `GET summary`
- `GET/POST /api/v1/payment-intents`, `GET /{id}`, `POST /{id}/start`, `POST /{id}/mark-manual-paid`, `POST /{id}/cancel`
- `POST /api/v1/payment-intents/{id}/mercadopago/webhook` (público)
- `GET /api/v1/payment-intents/{id}/mercadopago/callback` (público)

### A.2 Mapa del frontend de pagos

| Componente | Ruta | Responsabilidad |
|------------|------|-----------------|
| **PaymentListPage** | `/dashboard/pagos` | Lista de payments (caja), filtros, botón "Pagar con Mercado Pago" |
| **PaymentCreatePage** | `/dashboard/pagos/nuevo` | Crear payment manual |
| **PaymentDetailPage** | `/dashboard/pagos/:id` | Detalle de payment, marcar pagado, link a intent si payment_intent_id |
| **PaymentEditPage** | `/dashboard/pagos/:id/editar` | Editar payment pendiente |
| **PaymentOnlinePage** | `/dashboard/pagos/online` | Crear intent + start Mercado Pago → redirige a checkout MP |
| **PaymentIntentDetailPage** | `/dashboard/pagos/intento/:id` | Detalle de intent, polling tras callback, estados paid/failed/cancelled |

**APIs:**
- `api.ts`: fetchPayments, getPayment, createPayment, updatePayment, deletePayment, markPaymentPaid, cancelPayment
- `paymentIntentsApi.ts`: fetchPaymentIntents, getPaymentIntent, createPaymentIntent, startPaymentIntent, cancelPaymentIntent

### A.3 Flujo real de pago online (Mercado Pago)

1. Usuario va a **Pagos** → **Pagar con Mercado Pago**
2. Completa paciente/tutor, título, monto → **Continuar a Mercado Pago**
3. Frontend: `createPaymentIntent` (draft) → `startPaymentIntent` (provider: mercadopago)
4. Backend crea preferencia MP, transacción con `redirect_url` = init_point
5. Frontend redirige a `transaction.redirect_url` (checkout MP)
6. Usuario paga en MP
7. MP envía webhook a backend; MP redirige usuario al callback del backend
8. Backend callback: `provider->commit`, actualiza intent, redirige a `{APP_FRONTEND_URL}/dashboard/pagos/intento/{id}?status=...`
9. Frontend PaymentIntentDetailPage: carga intent, si status=approved y no paid → polling hasta paid/failed
10. Si paid: MercadoPagoProvider crea Payment (syncPaymentFromIntent) → aparece en lista de pagos

### A.4 Flujo real de pago manual

1. Usuario va a **Pagos** → **Registrar nuevo pago**
2. Completa paciente, concepto, monto → crea Payment (status pending)
3. En detalle: **Marcar pagado** con método (efectivo, débito, etc.)
4. Backend actualiza Payment (status paid, paid_at)

### A.5 Inconsistencias encontradas (y corregidas)

| # | Problema | Corrección |
|---|----------|------------|
| 1 | PaymentPolicy y PaymentIntentPolicy usaban roles `recepcion` y `vet` que no existen en User (solo admin, doctor, asistente, tutor) | Cambiado a `admin`, `doctor`, `asistente` |
| 2 | PaymentIntentController index devolvía paginator crudo (estructura anidada) en vez de `data` + `meta` como PaymentController | Unificado formato: `data: items[]`, `meta: { current_page, per_page, total, last_page }` |
| 3 | PaymentDetailPage no mostraba vínculo al PaymentIntent cuando el pago venía de Mercado Pago | Añadido bloque con link a `/dashboard/pagos/intento/{payment_intent_id}` |
| 4 | Tipo Payment en frontend no incluía `payment_intent_id` | Añadido al tipo en api.ts |
| 5 | Select de método en PaymentDetailPage no incluía "Mercado Pago" | Añadida opción mercadopago |
| 6 | PaymentIntentsListResponse no reflejaba estructura meta del backend | Actualizado tipo con meta opcional |

### A.6 Riesgos técnicos

- **Webhook en local:** Mercado Pago no puede alcanzar `localhost`. Para pruebas completas usar ngrok o similar.
- **APP_FRONTEND_URL:** Si no está definido, el callback redirige a APP_URL (backend). Debe estar en `.env` para desarrollo.
- **Idempotencia:** syncPaymentFromIntent verifica `Payment::where('payment_intent_id', $intent->id)->exists()` antes de crear.

### A.7 Problemas de UX (resueltos)

- Usuario que paga con MP y vuelve al callback ve correctamente la pantalla de detalle de intent (PaymentIntentDetailPage).
- Pagos creados desde MP muestran link a la intención en el detalle del payment.

### A.8 Arquitectura de datos

- **payments:** Registro de caja. Manual o generado desde PaymentIntent pagado (payment_intent_id).
- **payment_intents:** Intención de cobro online. Estados: draft, pending, paid, failed, cancelled.
- **payment_transactions:** Una o más por intent. external_id, redirect_url, status, payloads.

---

## B. Decisión arquitectónica recomendada

| Recurso | Representa | Convivencia |
|---------|-------------|-------------|
| **payments** | Registro de cobros (caja). Manual o desde intent pagado. | Fuente de verdad para reportes y caja. |
| **payment_intents** | Intención de cobro online (MP, Webpay). | Orquesta flujo: crear → start → webhook/callback → paid. |
| **payment_transactions** | Trazabilidad por intent. | Auditoría; estado final en intent. |

**Crear Payment cuando PaymentIntent queda paid:** Sí. MercadoPagoProvider::syncPaymentFromIntent crea Payment idempotente al marcar intent como paid.

**Flujo oficial:** Pagos manuales → payments. Pagos online → payment_intents → (al paid) → Payment creado automáticamente.

---

## C. Plan de corrección (ejecutado)

- [x] PaymentPolicy: roles recepcion/vet → doctor/asistente
- [x] PaymentIntentPolicy: mismo cambio
- [x] PaymentIntentController index: formato data + meta
- [x] PaymentDetailPage: link a intent cuando payment_intent_id
- [x] Tipo Payment: payment_intent_id
- [x] PaymentDetailPage: opción Mercado Pago en select método
- [x] PaymentIntentsListResponse: meta opcional
- [x] COMO_EJECUTAR_LOCAL: sección Mercado Pago

---

## D. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `backend_api/connyvet_api/app/Policies/PaymentPolicy.php` | Roles: recepcion, vet → doctor, asistente |
| `backend_api/connyvet_api/app/Policies/PaymentIntentPolicy.php` | Mismo cambio de roles |
| `backend_api/connyvet_api/app/Http/Controllers/Api/V1/PaymentIntentController.php` | index: respuesta con data + meta |
| `front/connyvet-frontend/src/payments/api.ts` | Tipo Payment: payment_intent_id |
| `front/connyvet-frontend/src/payments/pages/PaymentDetailPage.tsx` | Bloque link a intent, opción mercadopago en select |
| `front/connyvet-frontend/src/payments/paymentIntentsApi.ts` | PaymentIntentsListResponse con meta |
| `COMO_EJECUTAR_LOCAL.md` | Sección 2.1 Pagos online (Mercado Pago) |

---

## E. Checklist de pruebas manuales

### Pago manual
- [ ] Login como admin/doctor/asistente
- [ ] Ir a Pagos → Registrar nuevo pago
- [ ] Crear pago pendiente
- [ ] En detalle, marcar como pagado con método
- [ ] Verificar que aparece en lista como pagado

### Pago online (Mercado Pago)
- [ ] Configurar `.env` backend: APP_FRONTEND_URL=http://localhost:5173, MERCADOPAGO_ACCESS_TOKEN (sandbox)
- [ ] Ir a Pagos → Pagar con Mercado Pago
- [ ] Seleccionar paciente, monto, continuar
- [ ] Verificar redirección a checkout MP
- [ ] Completar pago en MP (sandbox)
- [ ] Verificar retorno a `/dashboard/pagos/intento/{id}` con estado pagado
- [ ] Verificar que el payment aparece en lista de pagos
- [ ] En detalle del payment, ver link "Ver intención de pago"

### Permisos
- [ ] Usuario doctor puede ver/crear pagos e intents
- [ ] Usuario asistente puede ver/crear pagos e intents
- [ ] Usuario tutor no puede acceder a módulo pagos

---

## F. Riesgos pendientes / decisiones a revisar

1. **Webhook en producción:** Configurar MERCADOPAGO_WEBHOOK_SECRET y URL pública del backend.
2. **Tutor y payment_intents:** Actualmente solo admin/doctor/asistente pueden crear intents. Si se quiere que tutores paguen desde app móvil, habría que definir política (ej. tutor solo sus intents).
3. **Consultation_id en intent:** El flujo actual no vincula automáticamente intent a consulta. Se puede extender desde detalle de consulta o presupuesto.
