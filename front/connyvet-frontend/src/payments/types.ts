// src/payments/types.ts

import type { Patient } from '../clinic/types';
import type { Tutor } from '../tutores/types';

export type PaymentStatus = 'pending' | 'paid';

export type PaymentMethod =
  | 'efectivo'
  | 'debito'
  | 'credito'
  | 'transferencia';

export interface Payment {
  id: number;
  patient_id: number;
  tutor_id?: number | null;

  consultation_id?: number | null;
  vaccine_application_id?: number | null;
  hospitalization_id?: number | null;

  concept: string;
  amount: number;
  status: PaymentStatus;
  method?: PaymentMethod | null;
  notes?: string | null;

  created_at?: string;
  updated_at?: string;

  patient?: Patient | null;
  tutor?: Tutor | null;
}

export interface PaymentFilters {
  search: string;
  status: 'all' | PaymentStatus;
  patient_id?: number;
  page: number;
  per_page: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

/**
 * Valores usados en el formulario (todo como string para inputs)
 */
export interface PaymentFormValues {
  patient_id: string;
  tutor_id: string;
  concept: string;
  amount: string;
  status: PaymentStatus;
  method: '' | PaymentMethod;
  notes: string;
}
