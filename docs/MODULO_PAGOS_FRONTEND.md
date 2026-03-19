# Módulo de Pagos — Frontend ConnyVet

## Estrategia implementada

**Experiencia profesional basada en Checkout Pro (link/redirect).**

El backend actual crea preferencias de Mercado Pago y genera un `payment_link` (Checkout Pro hosted). El frontend ofrece:

- **Detalle de pago** con layout profesional, branding Mercado Pago, resumen del cobro y botón "Pagar con Mercado Pago" que redirige al link.
- **Lista de pagos** con indicadores claros (link, estado), colores consistentes y CTA destacado.
- **Crear pago** con flujo explicado y validaciones visibles.

### Por qué no Bricks embebidos (aún)

Para integrar **Payment Brick** o **Card Payment Brick** embebidos en la página se requiere:

1. **Backend**: Endpoint `POST /process_payment` que reciba el `formData` del Brick y cree el pago en Mercado Pago vía API.
2. **Frontend**: `@mercadopago/sdk-react`, `initMercadoPago(VITE_MERCADOPAGO_PUBLIC_KEY)` y componente `<Payment>` con `preferenceId` y `onSubmit`.

El backend actual solo soporta el flujo de **preferencia + redirect**: el usuario paga en la página de Mercado Pago y el webhook actualiza el estado. No hay endpoint para procesar formData de tarjeta desde el Brick.

### Arquitectura preparada para Bricks

- Variable `VITE_MERCADOPAGO_PUBLIC_KEY` documentada en `.env.example`.
- Layout del detalle con sección "Pago con Mercado Pago" lista para reemplazar el botón redirect por un Brick cuando el backend lo soporte.

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `VITE_API_BASE_URL` | Sí | URL base del API (ej: `http://127.0.0.1:8000/api/v1`) |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | No (futuro) | Public key para Checkout Bricks embebidos |

---

## Pasos para probar localmente

1. **Backend**:
   ```bash
   cd backend_api/connyvet_api
   php artisan serve
   ```
   Configurar en `.env`: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_ENVIRONMENT`, `APP_URL`, `FRONTEND_URL`.

2. **Frontend**:
   ```bash
   cd front/connyvet-frontend
   cp .env.example .env   # si no existe .env
   npm run dev
   ```

3. **Flujo**:
   - Iniciar sesión como admin/doctor.
   - Ir a **Pagos** → **Crear pago**.
   - Seleccionar paciente, concepto y monto → Crear.
   - En el detalle, usar "Pagar con Mercado Pago" para abrir el checkout (sandbox).
   - Tras pagar, Mercado Pago redirige al callback → frontend muestra estado actualizado.

---

## Archivos modificados

- `payments/pages/PaymentDetailPage.tsx` — Rediseño completo
- `payments/pages/PaymentListPage.tsx` — Indicadores, colores, CTA
- `payments/pages/PaymentCreatePage.tsx` — Jerarquía visual, flujo explicado
- `front/connyvet-frontend/.env.example` — Variables documentadas
