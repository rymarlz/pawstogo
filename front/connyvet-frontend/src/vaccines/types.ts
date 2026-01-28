// src/vaccines/types.ts

// ===========================
// Vacunas (catálogo)
// ===========================
export interface Vaccine {
  id: number;
  name: string;
  species?: string | null; // perro, gato, etc.
  manufacturer?: string | null;
  short_description?: string | null;
  description?: string | null;

  default_dose_ml?: number | null;
  route?: string | null;

  min_age_weeks?: number | null;
  max_age_weeks?: number | null;
  default_interval_days?: number | null;

  // campo que usas en el form y payload
  notes?: string | null;

  is_core: boolean;
  active: boolean;

  extra_data?: Record<string, any> | null;

  created_at?: string;
  updated_at?: string;
}

export interface VaccineFilters {
  search?: string;
  species?: string;
  active?: 'all' | 'true' | 'false';
  page?: number;
  per_page?: number;
}

export interface VaccinePayload {
  name: string;
  species?: string | null;
  manufacturer?: string | null;
  short_description?: string | null;
  description?: string | null;

  default_dose_ml?: number | null;
  route?: string | null;

  min_age_weeks?: number | null;
  max_age_weeks?: number | null;
  default_interval_days?: number | null;

  // ahora TypeScript acepta que mandes notes
  notes?: string | null;

  is_core?: boolean;
  active?: boolean;
  extra_data?: Record<string, any> | null;
}

// ===========================
// Aplicaciones de vacuna
// ===========================
export type VaccineApplicationStatus =
  | 'pendiente'
  | 'aplicada'
  | 'omitida'
  | 'vencida';

export interface VaccineApplication {
  id: number;

  patient_id: number;
  tutor_id?: number | null;
  vaccine_id: number;
  consultation_id?: number | null;
  doctor_id?: number | null;

  // Relaciones resumidas
  patient?: {
    id: number;
    name: string;
    species?: string | null;
  } | null;

  tutor?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;

  vaccine?: {
    id: number;
    name: string;
    species?: string | null;
    is_core?: boolean;
  } | null;

  doctor?: {
    id: number;
    name: string;
    email?: string | null;
  } | null;

  planned_date?: string | null;   // YYYY-MM-DD
  applied_at?: string | null;     // ISO datetime
  next_due_date?: string | null;  // YYYY-MM-DD

  status: VaccineApplicationStatus;
  status_label?: string;

  dose_ml?: number | null;
  weight_kg?: number | null;

  batch_number?: string | null;
  serial_number?: string | null;
  application_site?: string | null;

  observations?: string | null;
  adverse_reactions?: string | null;

  active: boolean;
  attachments_meta?: Record<string, any> | null;
  extra_data?: Record<string, any> | null;

  created_at?: string;
  updated_at?: string;
}

export interface VaccineApplicationFilters {
  search?: string;
  patient_id?: number | null;
  tutor_id?: number | null;
  vaccine_id?: number | null;
  status?: VaccineApplicationStatus | 'all';
  date_from?: string; // sobre planned_date
  date_to?: string;
  upcoming?: boolean;
  page?: number;
  per_page?: number;
}

// ===========================
// Genérico de paginación
// ===========================
export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// ===========================
// Valores de formulario
// ===========================
export interface VaccineApplicationFormValues {
  // Selección de paciente (autocomplete)
  patient_id: string;
  patient_label: string;

  // tutor (opcional)
  tutor_id?: string;

  // Selección de vacuna (catálogo)
  vaccine_id: string;
  vaccine_label: string;

  // Fechas
  planned_date: string;   // YYYY-MM-DD
  applied_at: string;     // datetime-local
  next_due_date: string;  // YYYY-MM-DD

  // Estado
  status: VaccineApplicationStatus;

  // Datos clínicos
  dose_ml: string;
  weight_kg: string;
  batch_number: string;
  serial_number: string;
  application_site: string;

  observations: string;
  adverse_reactions: string;

  active: boolean;
}
