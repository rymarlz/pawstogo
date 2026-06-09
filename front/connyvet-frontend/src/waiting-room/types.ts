export type WaitingRoomStatus =
  | 'esperando'
  | 'en_atencion'
  | 'atendido'
  | 'cancelado';

export type WaitingRoomPriority = 'normal' | 'urgente';

export interface WaitingRoomPatientSummary {
  id: number;
  name: string;
  species?: string | null;
  species_display?: string | null;
  breed?: string | null;
  file_number?: number;
}

export interface WaitingRoomTutorSummary {
  id: number;
  name?: string | null;
  rut?: string | null;
}

export interface WaitingRoomEntry {
  id: number;
  patient_id: number;
  tutor_id: number;
  consultation_id?: number | null;
  reason: string;
  priority: WaitingRoomPriority;
  status: WaitingRoomStatus;
  notes?: string | null;
  arrived_at?: string | null;
  started_at?: string | null;
  attended_at?: string | null;
  cancelled_at?: string | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  patient?: WaitingRoomPatientSummary | null;
  tutor?: WaitingRoomTutorSummary | null;
  consultation?: { id: number; status?: string } | null;
}

export interface WaitingRoomFilters {
  status?: WaitingRoomStatus | 'all' | string;
  priority?: WaitingRoomPriority;
  include_history?: boolean;
  attended_today?: boolean;
  page?: number;
  per_page?: number;
}

export interface WaitingRoomPayload {
  patient_id: number;
  tutor_id: number;
  reason: string;
  priority?: WaitingRoomPriority;
  notes?: string | null;
}

export interface WaitingRoomUpdatePayload {
  status?: WaitingRoomStatus;
  priority?: WaitingRoomPriority;
  reason?: string;
  notes?: string | null;
  consultation_id?: number | null;
}

export interface PaginatedWaitingRoomResponse {
  data: WaitingRoomEntry[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
