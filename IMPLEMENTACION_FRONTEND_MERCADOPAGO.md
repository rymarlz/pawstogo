# Implementación frontend – Integración Mercado Pago ConnyVet

## A. Resumen de cambios frontend

1. **Nuevo cliente API y tipos para payment-intents**
   - Archivo `paymentIntentsApi.ts`: tipos `PaymentIntent`, `PaymentTransaction`, `PaymentIntentStatus`, `PaymentTransactionStatus`, payloads `CreatePaymentIntentPayload`, `StartPaymentIntentPayload`.
   - Funciones: `fetchPaymentIntents`, `getPaymentIntent`, `createPaymentIntent`, `startPaymentIntent`, `cancelPaymentIntent`.
   - El recurso `payments` (api.ts) no se mezcla con payment-intents; solo se añade el método `mercadopago` a `PaymentMethod` para los registros de caja que vienen del backend.

2. **Nueva página: detalle de intención de pago**
   - Ruta: `/dashboard/pagos/intento/:id`.
   - Componente: `PaymentIntentDetailPage`.
   - Carga el intent con `getPaymentIntent`; muestra título, monto (centavos → pesos), estado, proveedor.
   - Si el usuario llega con query `status=approved` y el intent aún no está `paid`, muestra "Verificando pago…" y hace polling cada 2,5 s hasta `paid`/`failed`/`cancelled` o 8 intentos.
   - Mensajes según estado: éxito (paid), rechazado/fallido (failed), cancelado (cancelled).
   - Manejo de loading, error y retry; enlace "Volver a Pagos".

3. **Nueva página: pago online (entrada a Mercado Pago)**
   - Ruta: `/dashboard/pagos/online`.
   - Componente: `PaymentOnlinePage`.
   - Formulario: selector de paciente (PatientPicker), título, descripción opcional, monto en pesos CLP.
   - Botón "Continuar a Mercado Pago": crea intent (draft), llama a start con provider `mercadopago`, redirige con `window.location.href = transaction.redirect_url`.
   - El monto se envía al backend en centavos (`amount_total = amountPesos * 100`).

4. **Integración en lista de pagos**
   - En `PaymentListPage`: botón "Pagar con Mercado Pago" que enlaza a `/dashboard/pagos/online`.
   - En `methodLabel`: caso `mercadopago` → "Mercado Pago" para que los pagos creados desde el backend al confirmar un intent se muestren correctamente.

5. **Rutas en App.tsx**
   - `/dashboard/pagos/online` → `PaymentOnlinePage`.
   - `/dashboard/pagos/intento/:id` → `PaymentIntentDetailPage`.
   - El callback del backend redirige a `/dashboard/pagos/intento/{id}?status=...&payment_id=...`, que es esta nueva ruta.

6. **Tipos**
   - `api.ts`: `PaymentMethod` incluye `'mercadopago'`.
   - `types.ts`: `PaymentMethod` incluye `'mercadopago'` para consistencia.

No se añade ítem nuevo en el menú del dashboard; el usuario llega al pago online desde la lista de pagos. Las pantallas actuales de payments (lista, nuevo, detalle, editar) no se modifican en su lógica ni rutas.

---

## B. Archivos modificados o creados

| Acción    | Ruta |
|-----------|------|
| **Crear** | `src/payments/paymentIntentsApi.ts` |
| **Crear** | `src/payments/pages/PaymentIntentDetailPage.tsx` |
| **Crear** | `src/payments/pages/PaymentOnlinePage.tsx` |
| Modificar | `src/App.tsx` |
| Modificar | `src/payments/pages/PaymentListPage.tsx` |
| Modificar | `src/payments/api.ts` |
| Modificar | `src/payments/types.ts` |

---

## C. Código completo por archivo

Los cambios ya están aplicados en el repositorio. Los archivos nuevos están completos; los modificados solo cambian en las partes indicadas en la sección D.

---

## D. Explicación breve por archivo

| Archivo | Motivo |
|---------|--------|
| **paymentIntentsApi.ts** | Cliente API y tipos para payment-intents; mantiene el flujo de pagos online separado del recurso payments. |
| **PaymentIntentDetailPage.tsx** | Vista de detalle de una intención de pago; compatible con el callback (ruta `/dashboard/pagos/intento/:id`); polling cuando llega `status=approved` y el intent aún no está paid. |
| **PaymentOnlinePage.tsx** | Formulario para crear intent y lanzar el pago con Mercado Pago; redirección al checkout. |
| **App.tsx** | Rutas para `/dashboard/pagos/online` y `/dashboard/pagos/intento/:id`. |
| **PaymentListPage.tsx** | Botón "Pagar con Mercado Pago" (link a online) y etiqueta "Mercado Pago" en método. |
| **api.ts** | Inclusión de `mercadopago` en `PaymentMethod` para pagos de caja originados por intent. |
| **types.ts** | Inclusión de `mercadopago` en `PaymentMethod` para coherencia de tipos. |

---

## E. Checklist de pruebas frontend

- [ ] **Lista de pagos:** La lista carga; el botón "Pagar con Mercado Pago" lleva a `/dashboard/pagos/online`.
- [ ] **Pago online (formulario):** En `/dashboard/pagos/online`, completar monto (ej. 15000), opcional paciente y título; "Continuar a Mercado Pago" crea intent, inicia con mercadopago y redirige a la URL de Mercado Pago (checkout).
- [ ] **Detalle de intento (sin callback):** Navegar manualmente a `/dashboard/pagos/intento/1` (id existente); se muestra el intent con estado correcto (draft/pending/paid/failed/cancelled).
- [ ] **Callback:** Tras pagar o cancelar en Mercado Pago, el backend redirige a `{frontend}/dashboard/pagos/intento/{id}?status=approved|rejected|pending|error`. La página muestra el estado; si `status=approved` y el intent sigue pending, aparece "Verificando pago…" y tras unos segundos pasa a "Pagado" (o fallido).
- [ ] **Polling:** Con `status=approved` y webhook aún no procesado, la página hace polling y actualiza a paid cuando el backend actualice el intent.
- [ ] **Errores:** Intent inexistente (404) muestra mensaje y "Reintentar" / "Volver a Pagos". Error de red al crear/iniciar pago muestra mensaje en el formulario.
- [ ] **Pagos manuales intactos:** Lista, nuevo pago, detalle y edición de pagos (recurso payments) siguen funcionando igual.
- [ ] **Método Mercado Pago en lista:** Un pago con `method: 'mercadopago'` (creado por el backend al confirmar un intent) se muestra con "Mercado Pago" en la columna Método.
- [ ] **Navegación:** Desde detalle de intento, "Volver a Pagos" lleva a `/dashboard/pagos`. Desde pago online, "Cancelar" y "Volver" llevan atrás o a la lista.
