import { apiFetch } from '../api';

export type PaymentStatus = 'pending' | 'paid' | 'cancelled';
export type PaymentMethod = 'efectivo' | 'debito' | 'credito' | 'transferencia';

export type Payment = {
  id: number;

  patient_id: number;
  tutor_id: number | null;

  consultation_id?: number | null;
  vaccine_application_id?: number | null;
  hospitalization_id?: number | null;

  concept: string;
  amount: number;
  status: PaymentStatus;

  method: PaymentMethod | null;
  notes: string | null;

  paid_at?: string | null;
  cancelled_at?: string | null;
  cancelled_reason?: string | null;

  created_at?: string;
  updated_at?: string;

  patient?: any;
  tutor?: any;
};

export type PaymentFilters = {
  status?: 'all' | PaymentStatus;
  page?: number;
  per_page?: number;

  patient_id?: number;
  tutor_id?: number;

  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
};

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type CreatePaymentPayload = {
  patient_id: number;
  tutor_id?: number | null;

  // ⚠️ manda estos SOLO si existen en tu DB
  consultation_id?: number | null;
  vaccine_application_id?: number | null;
  hospitalization_id?: number | null;

  concept: string;
  amount: number;
  status?: PaymentStatus; // default pending

  method?: PaymentMethod | null;
  notes?: string | null;
};

export type UpdatePaymentPayload = {
  concept: string;
  amount: number;
  status: PaymentStatus;
  method?: PaymentMethod | null;
  notes?: string | null;
};

function cleanString(v: unknown): string | null {
  const s = String(v ?? '').trim();
  return s ? s : null;
}
function cleanInt(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

export async function fetchPayments(token: string, filters: PaymentFilters = {}) {
  const params: Record<string, any> = {};
  if (filters.status && filters.status !== 'all') params.status = filters.status;
  if (filters.patient_id) params.patient_id = filters.patient_id;
  if (filters.tutor_id) params.tutor_id = filters.tutor_id;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;

  return apiFetch<Paginated<Payment>>('/payments', { method: 'GET', token, params });
}

export async function getPayment(token: string, id: number) {
  return apiFetch<{ data: Payment }>(`/payments/${id}`, { method: 'GET', token });
}

export async function createPayment(token: string, payload: CreatePaymentPayload) {
  const clean: any = {
    patient_id: payload.patient_id,
    tutor_id: payload.tutor_id ?? null,

    ...(payload.consultation_id != null ? { consultation_id: payload.consultation_id } : {}),
    ...(payload.vaccine_application_id != null ? { vaccine_application_id: payload.vaccine_application_id } : {}),
    ...(payload.hospitalization_id != null ? { hospitalization_id: payload.hospitalization_id } : {}),

    concept: cleanString(payload.concept) ?? 'Pago',
    amount: cleanInt(payload.amount),
    status: payload.status ?? 'pending',

    method: payload.method ?? null,
    notes: cleanString(payload.notes),
  };

  return apiFetch<{ data: Payment }>(`/payments`, { method: 'POST', token, data: clean });
}

export async function updatePayment(token: string, id: number, payload: UpdatePaymentPayload) {
  const clean: any = {
    concept: cleanString(payload.concept) ?? 'Pago',
    amount: cleanInt(payload.amount),
    status: payload.status,
    method: payload.method ?? null,
    notes: cleanString(payload.notes),
  };

  return apiFetch<{ data: Payment }>(`/payments/${id}`, { method: 'PUT', token, data: clean });
}

export async function deletePayment(token: string, id: number) {
  return apiFetch<void>(`/payments/${id}`, { method: 'DELETE', token });
}

export async function markPaymentPaid(
  token: string,
  id: number,
  payload: { method?: PaymentMethod | null; notes?: string | null } = {},
) {
  const clean: any = {
    ...(payload.method ? { method: payload.method } : {}),
    ...(payload.notes ? { notes: payload.notes } : {}),
  };

  return apiFetch<{ data: Payment }>(`/payments/${id}/mark-paid`, { method: 'POST', token, data: clean });
}

export async function cancelPayment(
  token: string,
  id: number,
  payload: { reason?: string | null } = {},
) {
  const clean: any = {
    ...(payload.reason ? { reason: payload.reason } : {}),
  };
  return apiFetch<{ data: Payment }>(`/payments/${id}/cancel`, { method: 'POST', token, data: clean });
}

export async function fetchPaymentsSummary(token: string, params?: { from?: string; to?: string }) {
  return apiFetch<{ data: any }>(`/payments/summary`, { method: 'GET', token, params: params ?? {} });
}
