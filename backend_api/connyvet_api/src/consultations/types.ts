// src/consultations/types.ts

export type ConsultationStatus = 'abierta' | 'cerrada' | 'anulada';

export type ExamPriority = 'normal' | 'urgente';
export type ExamStatus = 'requested' | 'done' | 'cancelled';

export interface TutorLite {
  id: number;
  name?: string;
  email?: string;
  phone?: string | null;
}

export interface PatientLite {
  id: number;
  name: string;
  species?: string;
  breed?: string | null;
}

export interface DoctorLite {
  id: number;
  name: string;
  email?: string;
}

// ======================
// Receta
// ======================

export interface ConsultationPrescriptionItem {
  drug_name: string;
  presentation?: string | null;
  dose?: string | null;
  frequency?: string | null;
  duration_days?: number | null;
  route?: string | null;
  instructions?: string | null;
  sort_order?: number;
}

export interface ConsultationPrescription {
  notes?: string | null;
  items: ConsultationPrescriptionItem[];
}

// ======================
// Exámenes
// ======================

export interface ConsultationExamOrder {
  exam_name: string;
  priority?: ExamPriority;
  status?: ExamStatus;
  notes?: string | null;
  sort_order?: number;
}

// ======================
// Consultation
// ======================

export interface Consultation {





  id: number;

  patient_id: number;
  tutor_id?: number | null;
  doctor_id?: number | null;

  patient?: PatientLite | null;
  tutor?: TutorLite | null;
  doctor?: DoctorLite | null;

  date?: string | null;
  visit_type?: string | null;
  reason?: string | null;

  anamnesis?: string | null;
  physical_exam?: string | null;
  diagnosis_primary?: string | null;
  diagnosis_secondary?: string | null;
  treatment?: string | null;
  recommendations?: string | null;

  weight_kg?: number | null;
  temperature_c?: number | null;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  body_condition_score?: number | null;

  next_control_date?: string | null;

  status?: ConsultationStatus;
  status_label?: string;
  active?: boolean;

  attachments_meta?: ConsultationAttachment[] | null;
  extra_data?: any;

  created_at?: string | null;
  updated_at?: string | null;

  // ✅ NUEVO
  prescription?: ConsultationPrescription | null;
  exam_orders?: ConsultationExamOrder[] | null;
  
}

// ======================
// Payload
// ======================

export type ConsultationUpsertPayload = {
  patient_id: number;
  tutor_id?: number | null;
  doctor_id?: number | null;

  date: string; // ISO
  visit_type?: string | null;
  status?: ConsultationStatus;

  reason?: string | null;
  anamnesis?: string | null;
  physical_exam?: string | null;
  diagnosis_primary?: string | null;
  diagnosis_secondary?: string | null;
  treatment?: string | null;
  recommendations?: string | null;

  weight_kg?: number | null;
  temperature_c?: number | null;
  heart_rate?: number | null;
  respiratory_rate?: number | null;
  body_condition_score?: number | null;

  next_control_date?: string | null; // YYYY-MM-DD (o ISO; backend lo acepta)
  active?: boolean;

  prescription?: ConsultationPrescription | null;
  exam_orders?: ConsultationExamOrder[] | null;
};

// ======================
// Filters / Pagination
// ======================

export type ConsultationFilters = {
  patient_id?: string | number;
  tutor_id?: string | number;
  doctor_id?: string | number;
  status?: 'all' | ConsultationStatus;
  visit_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
};

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };

  
}
export interface ConsultationAttachment {
  original_name: string;
  path: string;
  url: string;
  mime?: string;
  size?: number;
  note?: string | null;
  uploaded_by?: number | null;
  uploaded_at?: string | null;
}


export type AttachmentDraft = {
  file: File;
  detail: string; // nombre/detalle (UI)
};

// Lo que devuelve el backend en attachments_meta
export type AttachmentMeta = {
  original_name: string;
  path: string;
  url: string;
  mime?: string | null;
  size?: number | null;
  note?: string | null;       // ✅ este es el "detalle/nombre"
  uploaded_by?: number | null;
  uploaded_at?: string | null;
};


