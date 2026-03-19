/**
 * API y tipos para Payment Intents (flujo de pago online: Mercado Pago, etc.).
 * No reemplaza el recurso payments (registro de caja); es el flujo previo al cobro online.
 */
import { apiFetch } from '../api';

export type PaymentIntentStatus =
  | 'draft'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled';

export type PaymentTransactionStatus =
  | 'initiated'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface PaymentTransaction {
  id: number;
  payment_intent_id: number;
  provider: string;
  status: PaymentTransactionStatus;
  amount: number;
  currency: string;
  external_id?: string | null;
  redirect_url?: string | null;
  return_url?: string | null;
  request_payload?: Record<string, unknown> | null;
  response_payload?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentIntent {
  id: number;
  patient_id: number | null;
  tutor_id: number | null;
  consultation_id: number | null;
  currency: string;
  /** En centavos (backend y Mercado Pago). */
  amount_total: number;
  amount_paid: number;
  amount_refunded: number;
  status: PaymentIntentStatus;
  provider: string;
  title: string | null;
  description: string | null;
  meta: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  transactions?: PaymentTransaction[];
  patient?: unknown;
  tutor?: unknown;
  /** ID del Payment (registro de caja) cuando el intent está pagado. */
  payment_id?: number | null;
}

export interface PaymentIntentFilters {
  patient_id?: number;
  tutor_id?: number;
  consultation_id?: number;
  status?: PaymentIntentStatus;
  page?: number;
  per_page?: number;
}

export interface CreatePaymentIntentPayload {
  patient_id?: number | null;
  tutor_id?: number | null;
  consultation_id?: number | null;
  amount_total: number;
  currency?: string;
  provider?: 'manual' | 'webpay_plus' | 'mercadopago';
  title?: string | null;
  description?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface StartPaymentIntentPayload {
  provider?: 'manual' | 'webpay_plus' | 'mercadopago';
  return_url?: string | null;
  redirect_url?: string | null;
  origin?: string | null;
}

export interface PaymentIntentsListResponse {
  data: PaymentIntent[];
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

const PAYMENT_INTENTS_PATH = '/payment-intents';

export async function fetchPaymentIntents(
  token: string,
  filters: PaymentIntentFilters = {},
): Promise<PaymentIntentsListResponse> {
  const params: Record<string, string | number> = {};
  if (filters.patient_id != null) params.patient_id = filters.patient_id;
  if (filters.tutor_id != null) params.tutor_id = filters.tutor_id;
  if (filters.consultation_id != null) params.consultation_id = filters.consultation_id;
  if (filters.status) params.status = filters.status;
  if (filters.page != null) params.page = filters.page;
  if (filters.per_page != null) params.per_page = filters.per_page;

  return apiFetch<PaymentIntentsListResponse>(PAYMENT_INTENTS_PATH, {
    method: 'GET',
    token,
    params,
  });
}

export async function getPaymentIntent(
  token: string,
  id: number,
): Promise<{ data: PaymentIntent }> {
  return apiFetch<{ data: PaymentIntent }>(`${PAYMENT_INTENTS_PATH}/${id}`, {
    method: 'GET',
    token,
  });
}

export async function createPaymentIntent(
  token: string,
  payload: CreatePaymentIntentPayload,
): Promise<{ data: PaymentIntent; transaction?: PaymentTransaction }> {
  const body = {
    patient_id: payload.patient_id ?? null,
    tutor_id: payload.tutor_id ?? null,
    consultation_id: payload.consultation_id ?? null,
    amount_total: payload.amount_total,
    currency: payload.currency ?? 'CLP',
    provider: payload.provider ?? 'manual',
    title: payload.title?.trim() || null,
    description: payload.description?.trim() || null,
    meta: payload.meta ?? null,
  };

  return apiFetch<{ data: PaymentIntent; transaction?: PaymentTransaction }>(
    PAYMENT_INTENTS_PATH,
    { method: 'POST', token, data: body },
  );
}

export async function startPaymentIntent(
  token: string,
  id: number,
  payload: StartPaymentIntentPayload = {},
): Promise<{ data: PaymentIntent; transaction: PaymentTransaction }> {
  return apiFetch<{ data: PaymentIntent; transaction: PaymentTransaction }>(
    `${PAYMENT_INTENTS_PATH}/${id}/start`,
    {
      method: 'POST',
      token,
      data: {
        provider: payload.provider ?? 'mercadopago',
        return_url: payload.return_url ?? null,
        redirect_url: payload.redirect_url ?? null,
        origin: payload.origin ?? null,
      },
    },
  );
}

export async function cancelPaymentIntent(
  token: string,
  id: number,
  payload: { note?: string | null } = {},
): Promise<{ data: PaymentIntent }> {
  return apiFetch<{ data: PaymentIntent }>(
    `${PAYMENT_INTENTS_PATH}/${id}/cancel`,
    { method: 'POST', token, data: { note: payload.note ?? null } },
  );
}
