// src/hospitalizations/types.ts

export type HospitalizationStatus =
  | 'planned'
  | 'active'
  | 'discharged'
  | 'cancelled';

export interface Hospitalization {
  id: number;
  patient_id: number;
  tutor_id?: number | null;

  admission_date?: string | null;
  discharge_date?: string | null;

  status: HospitalizationStatus;

  bed_number?: string | null;
  notes?: string | null;

  patient?: {
    id: number;
    name: string;
  };

  tutor?: {
    id: number;
    name: string;
  };
}

export interface HospitalizationFilters {
  page?: number;
  per_page?: number;

  // filtros UI
  search?: string;
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD

  status?: HospitalizationStatus | 'all';
  patient_id?: number;
}

// 👇 formulario del front
export interface HospitalizationFormValues {
  patient_id: string;
  tutor_id: string;

  admission_date: string;
  discharge_date: string;

  status: HospitalizationStatus;

  bed_number: string;
  notes: string;
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
