# Diseño técnico: integración Mercado Pago en ConnyVet

Documento de arquitectura para integrar el pago con Mercado Pago en el flujo existente de `payment_intents`, sin duplicar módulos ni inventar flujos paralelos. Basado en el código real del repositorio.

---

## A. Diagnóstico validado del estado actual

### A.1 Backend (confirmado en código)

**Existe hoy:**

- **PaymentController** (`app/Http/Controllers/Api/PaymentController.php`): CRUD de recurso `payments`, `markPaid`, `cancel`, `destroy`, `summary`. Usa `PaymentPolicy` (roles admin, recepcion, vet). Métodos de pago: efectivo, debito, credito, transferencia. Respuesta paginada con `data` y `meta` (current_page, per_page, total, last_page).

- **PaymentIntentController** (`app/Http/Controllers/Api/V1/PaymentIntentController.php`): `index` (filtros patient_id, tutor_id, consultation_id, status), `show` (with transactions), `store` (StorePaymentIntentRequest; si provider ≠ manual llama a provider->start y devuelve `data` + `transaction`), `start` (recibe provider, return_url, redirect_url, origin; devuelve `data` + `transaction` con redirect_url), `markManualPaid`, `cancel`. Sin policy. Rutas bajo `auth:sanctum`.

- **MercadoPagoWebhookController** (`app/Http/Controllers/Api/V1/MercadoPagoWebhookController.php`): `webhook(int $id)` — valida type/data.id, opcionalmente x-signature con `config('services.mercadopago.webhook_secret')`, obtiene pago por PaymentClient, verifica external_reference === "PI-{$id}", llama a MercadoPagoProvider::commit. `callback(int $id)` — si hay payment_id llama a provider->commit, luego redirige a `config('app.frontend_url', config('app.url'))` + `/dashboard/pagos/{$id}?status=...`. Rutas públicas (sin auth).

- **MercadoPagoProvider** (`app/Services/Payments/MercadoPagoProvider.php`): `start` crea preferencia MP, usa amount_total/100 como unit_price (trata amount_total como centavos), guarda transacción con redirect_url = init_point; `commit` obtiene pago por id, actualiza o crea PaymentTransaction, llama a intent->markPaid/markFailed según status MP. buildWebhookUrl usa `config('app.url')` + `/api/v1/payment-intents/{$intentId}/mercadopago/webhook`.

- **PaymentProviderFactory**: hace `make('manual'|'webpay_plus'|'mercadopago')`. MercadoPago ya registrado.

- **Modelos**: Payment (fillable sin payment_intent_id), PaymentIntent (markPaid, markFailed, markCancelled), PaymentTransaction (request/response_payload json).

- **Rutas** (`routes/api.php`): payments bajo auth + can:viewAny,Payment; payment-intents bajo auth sin policy; webhook y callback bajo prefijo público `v1/payment-intents`.

- **Config**: `config/services.php` tiene mercadopago (access_token, public_key, webhook_secret, environment). `.env.example` tiene MERCADOPAGO_* pero no MERCADOPAGO_WEBHOOK_SECRET ni APP_FRONTEND_URL. `config/app.php` no define `frontend_url` (se usa fallback a `app.url`).

### A.2 Frontend (confirmado en código)

**Existe hoy:**

- **Módulo** `src/payments/`: `api.ts` (solo llamadas a `/payments`: fetchPayments, getPayment, createPayment, updatePayment, deletePayment, markPaymentPaid, cancelPayment, fetchPaymentsSummary), `types.ts` (Payment, PaymentFilters, etc.), páginas PaymentListPage, PaymentCreatePage, PaymentEditPage, PaymentDetailPage. PaymentDetailPage usa `getPayment(token, id)` y espera un objeto Payment del recurso payments; el `id` en la ruta es interpretado como payment.id.

- **Rutas en App.tsx**: `/dashboard/pagos`, `/dashboard/pagos/nuevo`, `/dashboard/pagos/:id`, `/dashboard/pagos/:id/editar`. Todas renderizan componentes que consumen solo el recurso `payments`. No existe ruta ni cliente para `payment-intents`.

- **DashboardLayout**: ítem "Pagos" → `/dashboard/pagos` (roles admin, doctor). No hay entrada a intenciones de pago ni a "pagar con Mercado Pago".

### A.3 Base de datos (confirmado en migraciones)

- **payments**: id, timestamps; columnas añadidas en migraciones posteriores: patient_id, tutor_id, consultation_id, vaccine_application_id, hospitalization_id, concept, amount, status, method, notes, paid_at, cancelled_at, cancelled_reason, created_by, deleted_at. No existe columna payment_intent_id.

- **payment_intents**: id, patient_id, tutor_id, consultation_id, currency, amount_total, amount_paid, amount_refunded, status, provider, title, description, meta (json), timestamps.

- **payment_transactions**: id, payment_intent_id (FK cascade), provider, status, amount, currency, external_id, authorization_code, response_code, redirect_url, return_url, request_payload, response_payload, timestamps.

### A.4 Mercado Pago: ¿funcional parcialmente?

- **Sí, en backend.** Crear intent + start con provider mercadopago devuelve transaction con redirect_url (init_point). Webhook y callback llaman a provider->commit y actualizan PaymentIntent/Transaction. La confirmación del pago depende del backend (webhook/callback), no solo del retorno del navegador.
- **No usable desde la app:** el frontend no crea ni inicia intents, no redirige a MP ni tiene una vista que entienda el id que devuelve el callback (payment_intent.id). Además, si APP_FRONTEND_URL no está definido, el callback redirige a app.url (backend), no al SPA.

### A.5 Inconsistencias detectadas

1. **Callback vs rutas frontend:** el callback redirige a `/dashboard/pagos/{id}` donde `id` es payment_intent.id. La ruta actual `/dashboard/pagos/:id` está asociada a PaymentDetailPage, que llama a `getPayment(token, id)` (recurso payments). Resultado: 404 o dato equivocado cuando el usuario vuelve de Mercado Pago.
2. **Configuración:** `app.frontend_url` no está en config; si no se define en .env, el callback usa la URL del backend. `.env.example` no documenta MERCADOPAGO_WEBHOOK_SECRET ni APP_FRONTEND_URL.
3. **PaymentIntent sin policy:** cualquier usuario autenticado puede listar/crear/ver/cancelar intents; no hay control por rol ni por pertenencia (ej. tutor solo sus intents).
4. **Unidad de amount_total:** la migración dice "en CLP (sin decimales)"; MercadoPagoProvider divide por 100 (trata como centavos). Debe confirmarse y documentarse la convención (recomendado: amount_total en pesos enteros y ajustar provider si MP espera decimal en pesos).
5. **PaymentPolicy vs DashboardLayout:** la policy usa roles recepcion/vet; el menú usa doctor/admin. Si el backend valida por recepcion/vet, puede haber desalineación; no modificar en este diseño pero tenerlo en cuenta para permisos de payment-intents.

---

## B. Decisión arquitectónica final

### Qué representa cada recurso

- **payments:** Registro de cobros efectivamente realizados (caja). Cada fila = un pago ya hecho o anotado (manual en ventanilla o, si se decide, generado al confirmar un payment_intent). Campos: concepto, monto, método (efectivo/débito/crédito/transferencia), estado (pending/paid/cancelled), relación con paciente/tutor/consulta/etc. Responsabilidad: historial de caja y reportes (summary por método, totales).

- **payment_intents:** Intención de cobro que puede resolverse por uno o más medios (manual, webpay_plus, mercadopago). Estados: draft → pending → paid | failed | cancelled. Responsabilidad: orquestar el flujo de pago online (crear intención, iniciar con proveedor, recibir webhook/callback, actualizar estado). No reemplaza a payments; es el flujo previo al “pago registrado” cuando el cobro es online.

- **payment_transactions:** Trazabilidad por intent: cada intent puede tener varias transacciones (una por intento de pago con un proveedor). Guarda external_id, redirect_url, request/response_payload, status. Responsabilidad: auditoría y soporte; la fuente de verdad del estado final del intent es el intent mismo (status/amount_paid) actualizado por el provider en commit.

### Flujo oficial para pagos online con Mercado Pago

1. Frontend crea PaymentIntent (POST /payment-intents) con patient_id/tutor_id/consultation_id, amount_total, title, description; provider puede ser manual o no.
2. Frontend inicia pago (POST /payment-intents/{id}/start) con provider=mercadopago y return_url/redirect_url (opcionales; backend puede derivar desde config).
3. Backend (MercadoPagoProvider->start) crea preferencia MP y transacción con redirect_url; responde con transaction.redirect_url.
4. Frontend redirige al usuario a transaction.redirect_url (checkout MP).
5. Usuario paga en MP; MP notifica al webhook y redirige al usuario al callback del backend.
6. Backend en webhook/callback ejecuta provider->commit; actualiza PaymentIntent y PaymentTransaction. Callback redirige al frontend a una ruta de “detalle de intención” con el payment_intent.id.
7. Frontend en esa ruta muestra el estado del intent (consultando GET /payment-intents/{id}) y, si está paid, mensaje de éxito; la confirmación definitiva es la que ya guardó el backend vía webhook.

### Estrategia: payments vs payment_intents

- **payments** se mantiene como registro de caja: manual (creado por recepción) o, si se implementa la opción elegida en la sección G, también generado al aprobar un PaymentIntent.
- **payment_intents** es el único flujo para “pagar con Mercado Pago” (y futuramente Webpay). No se inventa un flujo paralelo; se reutiliza PaymentIntentController, MercadoPagoProvider, webhook y callback.
- La mejor estrategia para este proyecto es: frontend mínimo que consuma los endpoints existentes de payment-intents, una ruta nueva de “detalle de intención” que resuelva el callback, y una decisión explícita sobre si al quedar un intent en paid se crea o no un Payment (ver sección G). Así se evita duplicar módulos y se mantiene una sola fuente de verdad para “intención de pago” y otra para “registro de caja”.

---

## C. Flujo funcional final propuesto

1. **Usuario hace clic en “Pagar con Mercado Pago”** (desde la pantalla que se defina: lista de pagos, detalle de consulta, presupuesto, etc.).
2. **Frontend** (si no tiene ya un intent en draft/pending para ese contexto): POST /api/v1/payment-intents con patient_id, tutor_id, consultation_id (si aplica), amount_total (en la unidad acordada), currency, title, description; provider puede omitirse o enviarse como manual. Backend crea intent en status draft.
3. **Frontend** llama POST /api/v1/payment-intents/{id}/start con body { provider: 'mercadopago', return_url?, redirect_url? }. Backend pone intent en pending, MercadoPagoProvider->start crea preferencia y transacción, devuelve data + transaction (con redirect_url).
4. **Frontend** redirige al usuario (window.location o similar) a transaction.redirect_url. El usuario ve el checkout de Mercado Pago.
5. **Usuario completa o abandona** el pago en MP. Mercado Pago:
   - Envía POST al webhook (notification_url) con type=payment y data.id.
   - Redirige al usuario al callback (back_urls) con status y payment_id en query.
6. **Backend – webhook:** Valida payload y opcionalmente firma; busca PaymentIntent por id en la ruta; obtiene el pago en MP; verifica external_reference; provider->commit actualiza intent (paid/failed/pending) y transacción. Respuesta 200 para no reintentar en vano.
7. **Backend – callback:** Opcionalmente vuelve a procesar con payment_id (idempotente); construye frontendUrl desde config (APP_FRONTEND_URL); redirige 302 a `{frontendUrl}/dashboard/pagos/intento/{id}?status=...&payment_id=...`.
8. **Frontend – ruta detalle de intención:** La ruta `/dashboard/pagos/intento/:id` carga GET /api/v1/payment-intents/{id}. Muestra: título, monto, estado (draft/pending/paid/failed/cancelled), y si status=approved desde query + intent.status !== 'paid' muestra “Verificando pago...” y repolling corto hasta que intent.status sea paid o failed o timeout. Cuando intent.status === 'paid', mensaje de éxito; si failed/cancelled, mensaje correspondiente.
9. **Qué ve el usuario en cada etapa:** Lista/contexto → botón “Pagar con Mercado Pago” → (opcional) pantalla resumen del intent → redirección a MP → checkout MP → vuelta a “Detalle de intención” con estado final (éxito, pendiente o error).

---

## D. Diseño de rutas y vistas frontend

### Rutas nuevas

- **Una sola ruta nueva:** `/dashboard/pagos/intento/:id`  
  - Componente: página de “Detalle de intención de pago” (PaymentIntentDetailPage o nombre equivalente).  
  - Responsabilidad: mostrar datos del intent, estado, y si viene de callback con status=approved pero intent aún no paid, indicar “Verificando…” y hacer GET periódico a /payment-intents/{id} hasta paid/failed o límite de intentos.

### Rutas existentes que se reutilizan

- `/dashboard/pagos` → lista de **payments** (registro de caja). Sin cambio de contrato.
- `/dashboard/pagos/nuevo` → crear **payment** manual. Sin cambio.
- `/dashboard/pagos/:id` → detalle de **payment** (solo cuando id es payment.id). Sin cambio.
- `/dashboard/pagos/:id/editar` → editar **payment**. Sin cambio.

### Ruta correcta para el detalle de una intención de pago

- **Detalle de intención:** `/dashboard/pagos/intento/:id` donde `id` es payment_intent.id.  
- El callback debe redirigir aquí: `{frontendUrl}/dashboard/pagos/intento/{id}?status=...` (no a `/dashboard/pagos/{id}`).

### Cómo debe quedar el callback

- Backend (MercadoPagoWebhookController::callback): usar una URL de frontend que incluya el segmento de intención. Ejemplo: `$redirectUrl = "{$frontendUrl}/dashboard/pagos/intento/{$id}";` y añadir query `?status=...&payment_id=...` como hoy. Así el usuario siempre cae en la vista que entiende payment_intent.id.

### Desde qué pantallas se podrá iniciar “Pagar con Mercado Pago”

- **Fase mínima:** desde la lista de pagos (`/dashboard/pagos`) con un botón/acción “Pagar online” que abra flujo: crear intent (o reutilizar uno pendiente por paciente/consulta) y start → redirección a MP.  
- **Fases posteriores (opcional):** desde detalle de consulta o presupuesto, con mismo patrón (crear intent vinculado a consultation_id o presupuesto y start).

### Navegación para no confundir payments con intents

- Menú actual “Pagos” sigue siendo la lista de **payments** (caja).  
- No es obligatorio añadir ítem “Pagos online” o “Intenciones” en el menú principal; el usuario puede llegar a “Pagar con Mercado Pago” desde la lista de pagos (o desde consulta/presupuesto).  
- La vista “Detalle de intención” (`/dashboard/pagos/intento/:id`) es a la que se llega tras el callback o desde un enlace “Ver estado del pago online”; no hace falta listar todos los intents en el menú si no se desea. Opcional: en PaymentListPage un filtro o pestaña “Pagos online” que liste intents (consumiendo GET /payment-intents) para staff.

---

## E. Diseño de endpoints y backend

### Endpoints existentes que se reutilizan

- GET /api/v1/payment-intents — listar (filtros: patient_id, tutor_id, consultation_id, status).  
- POST /api/v1/payment-intents — crear (StorePaymentIntentRequest).  
- GET /api/v1/payment-intents/{id} — detalle con transactions.  
- POST /api/v1/payment-intents/{id}/start — iniciar con provider (mercadopago); body: provider, return_url, redirect_url.  
- POST /api/v1/payment-intents/{id}/mark-manual-paid — pago manual (no cambia para MP).  
- POST /api/v1/payment-intents/{id}/cancel — cancelar intent.  
- Webhook y callback ya existen; solo ajustar la URL de redirección del callback.

### Endpoints nuevos

- Ninguno estrictamente necesario. El frontend puede usar index con filtros para “mis intents” o por consultation_id si se necesita.

### Ajuste en el callback controller

- En MercadoPagoWebhookController::callback, cambiar la construcción de redirectUrl de:
  - `$redirectUrl = "{$frontendUrl}/dashboard/pagos/{$id}";`
  - a:
  - `$redirectUrl = "{$frontendUrl}/dashboard/pagos/intento/{$id}";`
  - Mantener los query params status y payment_id.

### Policy para PaymentIntent

- **Sí, se recomienda.** Crear PaymentIntentPolicy (o reutilizar lógica de PaymentPolicy) con al menos viewAny, view, create. Criterio sugerido: mismos roles que pueden ver/crear payments (admin, recepcion, vet) o alinear con el menú (admin, doctor). Quien puede crear un payment puede crear un intent. view: solo si el usuario tiene permiso para ver el contexto (paciente/tutor/consulta) o es staff. Registrar la policy y aplicar middleware en las rutas de payment-intents (ej. can:viewAny,PaymentIntent para index/store; can:view,PaymentIntent para show/start/markManualPaid/cancel).

### Endpoint de consulta consolidada

- No es necesario un endpoint nuevo. GET /payment-intents/{id} ya devuelve el intent con transactions; el frontend puede mostrar estado y última transacción. Si más adelante se quiere una vista “todos los cobros (payments + intents pagados)”, podría ser un endpoint adicional; queda fuera del alcance mínimo.

### Flujo controller → provider → models

- Se mantiene: PaymentIntentController recibe start; hace PaymentProviderFactory::make(provider); provider->start(intent, context); el provider (MercadoPagoProvider) crea preferencia, crea PaymentTransaction, actualiza intent (pending); devuelve transaction. Webhook/callback reciben notificación; controller obtiene intent por id de ruta; llama provider->commit(payload); el provider actualiza PaymentTransaction e intent (markPaid/markFailed). Sin cambios de flujo; solo ajuste de URL en callback.

---

## F. Diseño de datos y estados

### Estados de PaymentIntent (existentes)

- draft: recién creado, aún no iniciado con ningún proveedor.  
- pending: iniciado (redirigido a MP o esperando pago manual).  
- paid: amount_paid >= amount_total (confirmado por commit).  
- failed: pago rechazado/cancelado/refunded/charged_back en MP.  
- cancelled: cancelado por la aplicación (cancel).

### Estados de PaymentTransaction (existentes)

- initiated: creada al hacer start; redirect_url disponible.  
- paid: commit con status approved.  
- failed: commit con status rejected/cancelled/refunded/charged_back.  
- pending: commit con status pending/in_process/in_mediation (se mantiene en transacción; el intent sigue pending).

### Mapeo desde Mercado Pago (ya en MercadoPagoProvider)

- approved → paid (intent.markPaid).  
- rejected, cancelled, refunded, charged_back → failed (intent.markFailed).  
- pending, in_process, in_mediation → transacción en pending; intent sigue pending.

### Cuándo pasa a paid / failed / pending

- **paid:** cuando MP notifica status approved y commit ejecuta markPaid.  
- **failed:** cuando MP notifica rejected/cancelled/refunded/charged_back y commit ejecuta markFailed.  
- **pending:** después de start hasta que llegue webhook/callback con approved o rechazo; o si MP devuelve pending/in_process/in_mediation.

### Datos mínimos para trazabilidad (ya persistidos)

- PaymentIntent: status, amount_total, amount_paid, provider, meta (mercadopago_payment_id, etc.).  
- PaymentTransaction: provider, status, amount, external_id, redirect_url, request_payload, response_payload. No hace falta agregar campos nuevos para la integración mínima.

### Campos nuevos

- No se requieren para el flujo mínimo. Opcional a futuro: payment_intent_id en payments si se adopta la opción de crear Payment al confirmar intent (ver sección G).

---

## G. Decisión sobre sincronización entre PaymentIntent y Payment

**Opciones:**

1. **No crear Payment automáticamente:** payments solo registro manual/administrativo; los pagos online quedan solo en payment_intents + payment_transactions.  
2. **Crear Payment automáticamente cuando PaymentIntent quede paid:** al marcar un intent como paid (en MercadoPagoProvider::commit o en un listener/observer), crear un registro en payments con concepto, monto, método “mercadopago” (o nuevo valor), patient_id/tutor_id/consultation_id del intent, status paid, paid_at ahora, y opcionalmente referencia al intent (si se agrega payment_intent_id a payments).  
3. **Vista consolidada sin fusión física:** mantener dos tablas; en frontend o en un endpoint se unifican listados (payments + intents pagados) para mostrar “todos los cobros” sin duplicar filas en BD.

**Análisis breve:**

- **Opción 1:** Ventaja: sin cambios en modelo Payment ni lógica de caja. Desventaja: reportes de caja (summary, por método) no incluyen cobros online a menos que se agregue lógica que sume intents pagados; dos fuentes de verdad para “qué se cobró”.  
- **Opción 2:** Ventaja: un solo lugar para caja (payments); summary y reportes incluyen todo; recepción ve todos los cobros en la misma lista. Desventaja: hay que añadir payment_intent_id a payments (migración) o al menos un campo “origen” (manual vs intent_id), y lógica al marcar intent como paid (crear Payment). Riesgo de duplicados si commit se llama dos veces (idempotencia: crear Payment solo si no existe ya uno para ese payment_intent_id).  
- **Opción 3:** Ventaja: no toca tablas; solo presentación. Desventaja: dos fuentes para reportes; si se quiere “total caja” hay que sumar en dos lados.

**Recomendación para ConnyVet:**

- **Recomendación: Opción 2 (crear Payment al confirmar PaymentIntent).**  
  - Justificación: el módulo de “Pagos” ya es el lugar donde el negocio mira qué se cobró; si los pagos con Mercado Pago no aparecen ahí, la experiencia es fragmentada y el summary no refleja la realidad. Un solo listado de cobros (payments) con método “mercadopago” (o “online”) mantiene la arquitectura actual (payments = registro de caja) y reutiliza summary, políticas y vistas.  
  - Implementación mínima: (1) Añadir columna payment_intent_id nullable a payments (migración). (2) Cuando MercadoPagoProvider (o el controller/listener que aplica markPaid) marque el intent como paid, después de intent->markPaid(...), crear Payment con: patient_id, tutor_id, consultation_id desde intent; concept = intent.title o "Pago online"; amount = amount_paid del intent; status = paid; method = 'credito' o un nuevo valor aceptado por el backend (ej. 'mercadopago'); paid_at = now(); payment_intent_id = intent.id; created_by = null o usuario sistema. (3) Idempotencia: antes de crear, comprobar si ya existe un payment con ese payment_intent_id; si existe, no crear otro.  
  - Impacto técnico: una migración, un punto de código (en provider o en un observer de PaymentIntent) que cree Payment una sola vez por intent pagado.  
  - Impacto UX: en la lista de pagos aparecerán también los cobros por Mercado Pago; el usuario puede filtrar por método si se desea. No hace falta cambiar la lista actual; solo asegurar que el método “mercadopago” (o el elegido) esté permitido en PaymentController y en tipos frontend.

**Si el equipo prefiere no tocar la tabla payments en la primera fase**, se puede implementar primero la opción 1 (sin creación automática) y en una fase posterior añadir la opción 2 (migración + creación de Payment al marcar intent como paid). El diseño de rutas y callback no depende de esta decisión.

---

## H. Cambios mínimos necesarios

Lista priorizada:

**Backend**

1. MercadoPagoWebhookController::callback: cambiar redirección a `/dashboard/pagos/intento/{$id}` (y mantener query params).  
2. Config: añadir en config/app.php (o en .env.example) la clave `frontend_url` => env('APP_FRONTEND_URL', env('APP_URL')) para que callback use la URL del SPA.  
3. .env.example: documentar APP_FRONTEND_URL y MERCADOPAGO_WEBHOOK_SECRET.  
4. PaymentIntentPolicy: crear policy (viewAny, view, create; opcional update/cancel) y registrar en AuthServiceProvider; aplicar middleware en rutas de payment-intents.  
5. (Si se adopta opción 2 de la sección G) Migración: add payment_intent_id nullable a payments; lógica idempotente al marcar intent como paid para crear Payment; aceptar método 'mercadopago' (o equivalente) en PaymentController/store/update y en validación.

**Frontend**

6. Ruta nueva: `/dashboard/pagos/intento/:id` → componente PaymentIntentDetailPage (o nombre equivalente).  
7. Cliente API: en payments o en un módulo payment-intents, funciones que llamen a GET/POST /payment-intents y POST /payment-intents/:id/start; tipos TypeScript para PaymentIntent y Transaction (redirect_url, status, etc.).  
8. PaymentIntentDetailPage: leer id de params; opcionalmente status/payment_id de query; GET /payment-intents/{id}; mostrar estado; si viene status=approved y intent aún no paid, mensaje “Verificando pago…” y polling cada 2–3 s hasta paid/failed o 3–5 intentos; mensajes de éxito/error según estado.  
9. Punto de entrada “Pagar con Mercado Pago”: en PaymentListPage (o donde se defina) botón/acción que cree intent (POST) y luego start (POST) y redirija a transaction.redirect_url.  
10. Tipados: tipos para PaymentIntent, PaymentTransaction, y payloads de create/start.

**Config / env**

11. .env: en desarrollo, APP_FRONTEND_URL=http://localhost:5173 (o el puerto del SPA); en producción, URL pública del front. MERCADOPAGO_WEBHOOK_SECRET en producción.

**Manejo de errores y estados de carga**

12. Frontend: en PaymentIntentDetailPage, manejar intent no encontrado (404), intent cancelado (mostrar mensaje), timeout de polling (mensaje “El pago puede tardar unos minutos”).  
13. Backend: no cambiar respuestas de error actuales; frontend debe interpretar 409 (ya pagado) y 404 (intent no existe).

---

## I. Riesgos y edge cases

- **Usuario vuelve antes del webhook:** El callback puede ejecutar commit con payment_id; si el webhook llega después, commit es idempotente (actualiza la misma transacción/intent). La vista de detalle de intent debe mostrar “Verificando…” y hacer polling; cuando el webhook actualice, el siguiente GET mostrará paid.  
- **Webhook duplicado:** commit debe ser idempotente (actualizar intent/transaction si ya están en paid no debe fallar ni crear duplicados). Si se crea Payment al marcar paid, la comprobación por payment_intent_id evita Payment duplicado.  
- **Callback con id no válido:** findOrFail devuelve 404; el controller captura y redirige a frontend con ?status=error. Frontend en /dashboard/pagos/intento/:id debe mostrar “Intención no encontrada” cuando GET /payment-intents/{id} devuelva 404.  
- **Intento ya pagado:** start devuelve 409; frontend no debe redirigir de nuevo a MP; mostrar mensaje “Este pago ya está pagado” y enlace al detalle del intent.  
- **Intento cancelado:** Si el usuario intenta start sobre un intent cancelado, el controller no lo impide hoy (solo verifica paid). Opcional: en start rechazar si status === 'cancelled'. Frontend: en detalle de intent cancelado no mostrar botón “Pagar”.  
- **Error de red:** Al crear intent o al hacer start, si falla la petición, frontend debe mostrar error y no redirigir. En la página de detalle, si el polling falla, mensaje de error y opción “Reintentar” o “Volver”.  
- **Payment intent huérfano:** Intents en draft sin transacción; no afecta a MP. Se pueden listar y cancelar o dejar; opcional limpieza por cron.  
- **Redirección a vista equivocada:** Corregido con la nueva ruta /dashboard/pagos/intento/{id} y el cambio en el callback.  
- **Permisos:** Sin policy, cualquier usuario autenticado puede ver/listar intents. Con PaymentIntentPolicy se restringe a roles que puedan ver pagos; opcionalmente filtrar index por tutor_id si el usuario es tutor.  
- **Sandbox vs producción:** MERCADOPAGO_ENVIRONMENT; en producción usar access token y webhook secret reales; notification_url debe ser HTTPS y accesible por MP. En sandbox el webhook puede no llegar a localhost; usar ngrok o similar para pruebas.

---

## J. Plan de implementación por fases

**Fase 1 – Ajustes mínimos (backend + config)**  
- Objetivo: callback redirija al frontend correcto; config y env listos.  
- Archivos: MercadoPagoWebhookController (redirectUrl), config/app.php (frontend_url), .env.example.  
- Riesgo: bajo.  
- Criterio de éxito: callback redirige a {APP_FRONTEND_URL}/dashboard/pagos/intento/{id}?status=...

**Fase 2 – Frontend usable (ruta + API + flujo)**  
- Objetivo: usuario puede hacer clic en “Pagar con Mercado Pago”, ir a MP, volver y ver resultado en detalle de intención.  
- Archivos: App.tsx (ruta), nuevo componente PaymentIntentDetailPage, api/tipos para payment-intents, PaymentListPage (o otra) con botón y flujo create + start + redirect.  
- Riesgo: medio (coordinación front/back).  
- Criterio de éxito: flujo completo en sandbox; usuario ve “Pago realizado” o “Pago pendiente/rechazado” en /dashboard/pagos/intento/:id.

**Fase 3 – Endurecimiento (policy, idempotencia, errores)**  
- Objetivo: permisos, idempotencia de commit y (si aplica) creación de Payment, manejo de 404/409 y polling.  
- Archivos: PaymentIntentPolicy, AuthServiceProvider, MercadoPagoProvider o observer (crear Payment si opción 2), frontend (manejo de errores y estados).  
- Riesgo: bajo-medio.  
- Criterio de éxito: solo roles autorizados gestionan intents; webhooks duplicados no duplican Payment; mensajes claros en frontend.

**Fase 4 – Mejoras UX (opcional)**  
- Objetivo: acceso a “Pagar con Mercado Pago” desde consulta/presupuesto; lista o filtro de intents; mensajes y retornos más claros.  
- Archivos: páginas de consulta/presupuesto, posible listado de intents, textos y estados de carga.  
- Riesgo: bajo.  
- Criterio de éxito: experiencia coherente y sin confusión entre payments e intents.

---

## K. Lista exacta de archivos que deberían modificarse después de aprobar este diseño

**Backend (backend_api/connyvet_api/)**

- `app/Http/Controllers/Api/V1/MercadoPagoWebhookController.php` — cambiar URL de redirección del callback a `/dashboard/pagos/intento/{$id}`.
- `config/app.php` — añadir clave `frontend_url` (env('APP_FRONTEND_URL', env('APP_URL'))).
- `.env.example` — añadir APP_FRONTEND_URL, MERCADOPAGO_WEBHOOK_SECRET (y comentarios si se desea).
- `app/Policies/PaymentIntentPolicy.php` — crear (viewAny, view, create).
- `app/Providers/AuthServiceProvider.php` — registrar PaymentIntentPolicy.
- `routes/api.php` — aplicar middleware de policy a las rutas de payment-intents (can:viewAny,PaymentIntent y can:view,PaymentIntent donde corresponda).
- (Si se adopta creación automática de Payment) `database/migrations/xxxx_xx_xx_add_payment_intent_id_to_payments_table.php` — nueva migración.
- (Si se adopta creación automática de Payment) `app/Models/Payment.php` — añadir payment_intent_id al fillable y relación paymentIntent si se usa.
- (Si se adopta creación automática de Payment) Lógica de creación de Payment al marcar intent como paid: bien en `app/Services/Payments/MercadoPagoProvider.php` (después de markPaid) o en un Observer de PaymentIntent, con chequeo idempotente por payment_intent_id.
- (Si se adopta creación automática de Payment) `app/Http/Controllers/Api/PaymentController.php` — permitir método 'mercadopago' (o el valor elegido) en reglas de validación de store/update/markPaid.

**Frontend (front/connyvet-frontend/src/)**

- `App.tsx` — añadir ruta `/dashboard/pagos/intento/:id` que renderice la nueva página de detalle de intención.
- `payments/pages/PaymentIntentDetailPage.tsx` — nuevo archivo (o nombre equivalente): leer :id y query; llamar GET /payment-intents/{id}; mostrar estado; polling si status=approved y intent no paid; mensajes éxito/error.
- `payments/api.ts` — añadir funciones getPaymentIntent, createPaymentIntent, startPaymentIntent (o archivo aparte paymentIntents/api.ts con tipos en paymentIntents/types.ts).
- `payments/types.ts` — (o paymentIntents/types.ts) añadir tipos PaymentIntent, PaymentTransaction, CreatePaymentIntentPayload, StartPaymentIntentPayload.
- `payments/pages/PaymentListPage.tsx` — añadir botón/acción “Pagar con Mercado Pago” que ejecute create + start y redirija a transaction.redirect_url (y opcionalmente enlace a “Ver estado” a /dashboard/pagos/intento/:id).
- (Opcional) `layouts/DashboardLayout.tsx` — si se agrega ítem de menú para “Pagos online” o listado de intents; no obligatorio en mínimo.

No se listan archivos de tests; se recomienda añadir pruebas para el callback, la policy y la creación de Payment (si aplica) una vez implementado.
