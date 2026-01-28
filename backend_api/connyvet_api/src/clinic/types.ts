// src/clinic/types.ts

// =========================
// Catálogos base
// =========================

/**
 * Especies soportadas para pacientes.
 * Si en el futuro agregas más, solo extiendes este union.
 */
export type Species = 'perro' | 'gato' | 'ave' | 'roedor' | 'reptil' | 'otro';

/**
 * Sexo biológico del paciente.
 */
export type Sex = 'macho' | 'hembra' | 'desconocido';

// =========================
// Meta / paginación genérica
// =========================

/**
 * Información de paginación que devuelve Laravel (LengthAwarePaginator).
 */
export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/**
 * Respuesta genérica paginada del API.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta?: PaginatedMeta;
}

// =========================
// Pacientes
// =========================

/**
 * Paciente tal como viene desde la API Laravel.
 * Mantiene datos de tutor denormalizados para que los listados sean rápidos.
 */
export interface Patient {
  id: number;

  // FK al tutor (cuando ya esté implementado en Laravel)
  tutor_id?: number | null;

  // Datos de la mascota
  name: string;
  species: Species;
  breed: string | null;
  sex: Sex | null;
  birth_date: string | null;
  color: string | null;
  microchip: string | null;

  // Datos clínicos adicionales
  weight_kg: number | null;
  sterilized: boolean;
  notes: string | null;

  // Datos del tutor (denormalizados para mostrar en listas / formularios)
  tutor_name: string;
  tutor_email: string | null;
  tutor_phone: string | null;

  // Estado lógico
  active: boolean;
  photo_url?: string | null; // 👈 NUEVO
  // Timestamps (opcionales por si el backend decide no enviarlos)
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * Payload que se envía al crear/editar un paciente.
 * Debe mapear 1:1 con el Request de Laravel (FormRequest o similar).
 */
export interface PatientPayload {
  // FK al tutor (puede ser null o ausente mientras migres desde modo “rápido”)
  tutor_id?: number | null;

  // Datos de la mascota
  name: string;
  species: Species;
  breed: string | null;
  sex: Sex | null;
  birth_date: string | null;
  color: string | null;
  microchip: string | null;

  // Datos clínicos adicionales
  weight_kg: number | null;
  sterilized: boolean;
  notes: string | null;

  // Datos del tutor tal como se capturan en el formulario actual
  tutor_name: string;
  tutor_email: string | null;
  tutor_phone: string | null;

  // Estado lógico
  active: boolean;
}

/**
 * Filtros que enviamos al endpoint GET /patients.
 * Están pensados para mapear directo a query params.
 */
export interface PatientFilters {
  /**
   * Búsqueda libre por nombre de paciente / tutor / chip (según lo que implemente el backend).
   */
  search: string;

  /**
   * Filtrar por especie específica, o '' para “todas”.
   */
  species: '' | Species;

  /**
   * all   -> sin filtro de estado
   * true  -> solo activos
   * false -> solo inactivos
   */
  active: 'all' | 'true' | 'false';

  /**
   * Paginación
   */
  page: number;
  per_page: number;

  /**
   * (Opcional) para listar pacientes de un tutor específico.
   */
  tutor_id?: number | null;
}

/**
 * Respuesta del listado de pacientes.
 * Es compatible con el patrón genérico PaginatedResponse<T>.
 */
export interface PatientListResponse extends PaginatedResponse<Patient> {
  data: Patient[];
  meta?: PaginatedMeta;
}
