# Informe de diagnóstico — ConnyVet (QA y calidad de código)

> Análisis exhaustivo del proyecto sin aplicar cambios. Clasificación por prioridad y propuesta de solución para cada hallazgo.

---

## Tabla resumen de hallazgos

| ID | Prioridad | Categoría | Descripción breve |
|----|-----------|-----------|-------------------|
| 1 | **Alta** | Rutas / Bugs | Rutas de adjuntos mal anidadas en `api.php`: prefijo `v1` duplicado y ruta `storeAttachments` incorrecta |
| 2 | **Alta** | Seguridad | Ruta `/dashboard/pagos/:id` sin `ProtectedRoute`: `PaymentDetailPage` accesible sin redirigir a login |
| 3 | **Alta** | Bugs | Ruta `/dashboard/presupuestos/:id/editar` renderiza `BudgetListPage` en lugar de página de edición |
| 4 | **Alta** | Seguridad | Webhook MercadoPago sin verificación de firma (x-signature): riesgo de webhooks falsos |
| 5 | **Media** | Seguridad / Robustez | Log de request completo en `uploadAttachments` (incl. datos sensibles) y UPLOAD DEBUG en producción |
| 6 | **Media** | Bugs / UX | Ruta `/dashboard/agenda` definida dos veces: redirección a consultas vs `AgendaPage` (gana la segunda) |
| 7 | **Media** | Robustez | `AuthController::logout()` sin comprobar `$request->user()` antes de usar; puede lanzar si token ya revocado |
| 8 | **Media** | Calidad / Consistencia | `AuthContext` usa solo `VITE_API_URL`; `api/index.ts` usa `VITE_API_BASE_URL ?? VITE_API_URL` — desalineación en producción |
| 9 | **Media** | Calidad | `apiFetch` lanza el JSON crudo en errores; no hay tipo `ApiError` ni manejo estándar en frontend |
| 10 | **Media** | Código duplicado | Carpeta `backend_api/connyvet_api/src/` duplica frontend (React/TS); puede desincronizarse |
| 11 | **Media** | Rendimiento / Escalabilidad | `ConsultationForm` pide `/patients?per_page=200` y `/admin/users?per_page=100`; límite fijo sin paginación real |
| 12 | **Baja** | Calidad | `ConsultationController` muy largo (~800 líneas); lógica PDF y helpers mezclados con CRUD |
| 13 | **Baja** | Calidad | `DashboardPage`: dos `useEffect` que disparan peticiones en paralelo; podría unificarse o documentarse |
| 14 | **Baja** | Calidad | `data?: any` y `body?: any` en `ApiFetchOptions`; tipado débil para cuerpos de petición |
| 15 | **Baja** | Calidad | `console.log` / `console.table` en `attachmentsApi.ts` (debug) en código de producción |

---

## Detalle por hallazgo

### 1. Rutas de adjuntos mal anidadas en `api.php` (Alta)

**Dónde:** `backend_api/connyvet_api/routes/api.php` líneas 124-134.

**Problema:** Dentro del grupo que ya tiene prefijo `v1` se abre otro `Route::prefix('v1')`. La ruta `storeAttachments` queda registrada como `POST /api/v1/v1/consultations/{consultation}/attachments`. El frontend llama a `POST .../api/v1/consultations/.../attachments` (uploadAttachments), por lo que `storeAttachments` no coincide con lo que usa la app y la estructura es confusa.

**Solución propuesta:** Eliminar el grupo interno `Route::prefix('v1')->middleware('auth:sanctum')` y dejar una sola definición de rutas de adjuntos dentro del grupo protegido existente, por ejemplo: `Route::post('consultations/{consultation}/attachments', [ConsultationController::class, 'uploadAttachments'])` (y mantener `storeAttachments` solo si se usa en otro flujo, con la misma ruta base sin duplicar `v1`).

---

### 2. Ruta `/dashboard/pagos/:id` sin protección (Alta)

**Dónde:** `front/connyvet-frontend/src/App.tsx` líneas 314 y 318.

**Problema:** Hay dos rutas para el mismo path `/dashboard/pagos/:id`: una con `ProtectedRoute` y `PaymentEditPage`, otra sin `ProtectedRoute` con `PaymentDetailPage`. React Router usa la última coincidencia, por lo que se renderiza `PaymentDetailPage` sin pasar por `ProtectedRoute`. Un usuario no autenticado puede entrar a la URL y ver la página (con fallos de carga por falta de token), en lugar de ser redirigido al login.

**Solución propuesta:** Envolver `PaymentDetailPage` en `ProtectedRoute`. Opcionalmente separar rutas: `/dashboard/pagos/:id` para detalle y `/dashboard/pagos/:id/editar` para edición, y eliminar la duplicación.

---

### 3. Ruta “editar presupuesto” apunta al listado (Alta)

**Dónde:** `front/connyvet-frontend/src/App.tsx` líneas 339-346.

**Problema:** La ruta `/dashboard/presupuestos/:id/editar` tiene como elemento `BudgetListPage` en lugar de una página de edición. No existe `BudgetEditPage` en el proyecto. El usuario que intenta “editar” un presupuesto vuelve al listado.

**Solución propuesta:** Crear `BudgetEditPage` (o reutilizar formulario de presupuesto con id) y usarla en esta ruta, o eliminar la ruta si la edición se hace desde `BudgetDetailPage`. El backend ya expone `PUT /api/v1/budgets/{budget}`.

---

### 4. Webhook MercadoPago sin verificación de firma (Alta)

**Dónde:** `backend_api/connyvet_api/app/Http/Controllers/Api/V1/MercadoPagoWebhookController.php` método `webhook`.

**Problema:** MercadoPago envía un header `x-signature` (o similar) para que el receptor verifique que el POST viene de ellos. No se comprueba la firma, por lo que un atacante que conozca la URL podría enviar POSTs falsos y marcar pagos como cobrados o alterar estados.

**Solución propuesta:** Usar la documentación de MercadoPago para validar la firma (x-signature + secret) antes de procesar el webhook. Rechazar con 401/403 si la firma no es válida y no actualizar estado de pagos.

---

### 5. Log de request completo en upload de adjuntos (Media)

**Dónde:** `backend_api/connyvet_api/app/Http/Controllers/Api/ConsultationController.php` método `uploadAttachments` (aprox. líneas 657-667).

**Problema:** Se hace `logger()->error('UPLOAD DEBUG', [..., 'request_all' => $request->all()])` en cada subida. En producción esto puede escribir en logs datos sensibles o contenido de formulario. Además, el “UPLOAD DEBUG” no debería ejecutarse siempre en producción.

**Solución propuesta:** Quitar o reducir el log a campos no sensibles (por ejemplo: content-type, has_files, count). Si se mantiene algo de debug, condicionarlo a `config('app.debug')` o a un canal de log específico.

---

### 6. Ruta `/dashboard/agenda` definida dos veces (Media)

**Dónde:** `front/connyvet-frontend/src/App.tsx` línea 292 y 316-323.

**Problema:** Primero se define `path="/dashboard/agenda"` con `<Navigate to="/dashboard/consultas" />` y después el mismo path con `AgendaPage`. La segunda definición gana, por lo que la redirección nunca se aplica y el comportamiento queda poco claro.

**Solución propuesta:** Dejar una sola definición: o bien redirigir `/dashboard/agenda` a `/dashboard/consultas`, o bien mostrar `AgendaPage`, y documentar la decisión. Eliminar la ruta duplicada.

---

### 7. `AuthController::logout()` sin comprobar usuario (Media)

**Dónde:** `backend_api/connyvet_api/app/Http/Controllers/AuthController.php` método `logout`.

**Problema:** Se llama a `$request->user()->currentAccessToken()->delete()` sin comprobar si `$request->user()` es null. Si el token ya fue revocado o es inválido, en algunos escenarios el middleware podría no devolver 401 y pasar un usuario null, provocando un error 500.

**Solución propuesta:** Comprobar `if (!$request->user()) { return response()->json(['message' => 'No autenticado'], 401); }` antes de usar el usuario, o asegurar que la ruta de logout solo se registre dentro de `auth:sanctum` y que Sanctum devuelva 401 cuando no hay usuario.

---

### 8. Variables de entorno de API distintas entre AuthContext y api/index (Media)

**Dónde:** `front/connyvet-frontend/src/auth/AuthContext.tsx` (usa `VITE_API_URL`) y `front/connyvet-frontend/src/api/index.ts` (usa `VITE_API_BASE_URL ?? VITE_API_URL`).

**Problema:** Si en producción solo se define `VITE_API_BASE_URL`, el cliente de axios en `AuthContext` usará el fallback `/api/v1` (URL relativa), mientras que `apiFetch` usará la URL absoluta. Con front y API en distintos orígenes, login/me podrían fallar o ir a un host equivocado.

**Solución propuesta:** Usar la misma fuente de verdad: por ejemplo, una constante compartida que lea `VITE_API_BASE_URL ?? VITE_API_URL ?? 'http://localhost:8000/api/v1'` y usarla tanto en `AuthContext` como en `api/index.ts`.

---

### 9. Errores de API sin tipo ni manejo estándar (Media)

**Dónde:** `front/connyvet-frontend/src/api/index.ts`: en respuestas no ok se hace `throw json`.

**Problema:** Se lanza el objeto JSON crudo (puede tener `message`, `errors`, etc.). No hay tipo `ApiError` ni convención para mensajes mostrables al usuario, lo que lleva a manejos inconsistentes (`err?.message`, `err?.errors`, etc.) y posible pérdida de mensajes de validación.

**Solución propuesta:** Definir un tipo `ApiError` (p. ej. `{ message?: string; errors?: Record<string, string[]> }`) y una función que normalice la respuesta de error y lance (o devuelva) ese tipo. En componentes, usar un helper para “mensaje a mostrar” (message o primer error de `errors`).

---

### 10. Código frontend duplicado en backend (Media)

**Dónde:** `backend_api/connyvet_api/src/` (árbol de componentes React/TS similar a `front/connyvet-frontend/src/`).

**Problema:** Hay una copia de módulos (agenda, api, consultations, payments, budgets, etc.) dentro del repo del backend. Aumenta mantenimiento y riesgo de que backend y front real divergan sin darse cuenta.

**Solución propuesta:** Si no hay un motivo (p. ej. build desde backend), eliminar `backend_api/connyvet_api/src/` y usar solo `front/connyvet-frontend/`. Si se usa para algo (SSR, tooling), documentarlo y, si es posible, referenciar el front como único origen (submódulo o paquete) para evitar duplicación.

---

### 11. Límites fijos de paginación en ConsultationForm (Media)

**Dónde:** `front/connyvet-frontend/src/consultations/components/ConsultationForm.tsx` (llamadas a `/patients?per_page=200` y `/admin/users?role=doctor&per_page=100`).

**Problema:** Si hay más de 200 pacientes o más de 100 doctores, no se muestran todos. No hay paginación ni búsqueda en esos selects; la experiencia se degrada con muchos datos.

**Solución propuesta:** Introducir búsqueda (input que filtre por nombre) y/o paginación/infinite scroll en los desplegables, o al menos aumentar el límite con aviso de “mostrando los primeros N” y en backend asegurar que el endpoint soporte `per_page` alto o búsqueda.

---

### 12. ConsultationController demasiado largo (Baja)

**Dónde:** `backend_api/connyvet_api/app/Http/Controllers/Api/ConsultationController.php` (~807 líneas).

**Problema:** Un solo controlador concentra listado, CRUD, PDFs (varios tipos), prescripción, órdenes de examen, adjuntos y helpers de HTML. Dificulta pruebas y lectura; mezcla responsabilidades.

**Solución propuesta:** Extraer servicios o clases de apoyo, por ejemplo: `ConsultationPdfService` (getLogoDataUri, renderPdfHtml, generación por tipo), y dejar en el controlador solo la orquestación y las respuestas HTTP. Opcional: controlador dedicado para “ConsultationAttachmentController” si ya existe la ruta.

---

### 13. Dos useEffects con peticiones en DashboardPage (Baja)

**Dónde:** `front/connyvet-frontend/src/pages/DashboardPage.tsx`: efectos para “consultas de hoy” y “vacunas próximas”.

**Problema:** Dos efectos que se disparan con `[token]` hacen dos peticiones en paralelo. No es incorrecto, pero podría ser un único efecto que lance ambas peticiones (p. ej. `Promise.all`) para un único “loading” y un manejo de errores más claro.

**Solución propuesta:** Opcional: un solo `useEffect` que llame a las dos APIs y actualice ambos estados (o usar un estado de “dashboard loading” único). Mantener separación de estado por dominio está bien; la mejora es sobre claridad y posible UX de carga.

---

### 14. Tipado débil en ApiFetchOptions (Baja)

**Dónde:** `front/connyvet-frontend/src/api/index.ts`: `data?: any`, `body?: any`.

**Problema:** Uso de `any` en cuerpos de petición reduce la utilidad de TypeScript y no fuerza contratos con el backend.

**Solución propuesta:** Sustituir por genéricos o tipos más concretos según el método (p. ej. `data?: Record<string, unknown>` o un union de payloads por recurso) y evitar `any` en la medida de lo posible.

---

### 15. Console.log en attachmentsApi (Baja)

**Dónde:** `front/connyvet-frontend/src/consultations/attachmentsApi.ts`: `console.log`, `console.table` de debug.

**Problema:** En producción ensucia la consola y puede exponer información de archivos o flujos.

**Solución propuesta:** Eliminar estos logs o envolverlos en `if (import.meta.env.DEV)` (o variable de entorno equivalente) para que solo se ejecuten en desarrollo.

---

## Resumen por prioridad

| Prioridad | Cantidad | IDs |
|-----------|----------|-----|
| **Alta**  | 4        | 1, 2, 3, 4 |
| **Media** | 7        | 5, 6, 7, 8, 9, 10, 11 |
| **Baja**  | 4        | 12, 13, 14, 15 |

---

## Recomendación de orden de actuación

1. Corregir rutas en `api.php` (1) y en `App.tsx` (2, 3, 6) para evitar bugs y fallos de seguridad de acceso.
2. Añadir verificación de firma al webhook de MercadoPago (4) y revisar logs sensibles en uploads (5).
3. Alinear env de API (8), robustecer logout (7) y definir manejo de errores de API en front (9).
4. Decidir y limpiar duplicación en `backend_api/.../src/` (10) y mejorar paginación/búsqueda en formularios (11).
5. Refactorizar controlador grande (12), opcionalmente unificar carga del dashboard (13), endurecer tipos (14) y quitar logs de producción (15).

---

*Informe generado sin aplicar cambios en el código. Fecha de análisis: según ejecución del diagnóstico.*
