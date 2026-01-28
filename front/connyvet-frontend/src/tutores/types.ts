// src/tutores/types.ts

// =========================
// Modelo base de Tutor (respuesta de la API)
// =========================
export interface Tutor {
  id: number;
  nombres: string | null;
  apellidos: string | null;
  rut: string | null;
  email: string | null;
  telefono_movil: string | null;
  telefono_fijo: string | null;
  direccion: string | null;
  comuna: string | null;
  region: string | null;
  estado_civil: string | null;
  ocupacion: string | null;
  nacionalidad: string | null;
  fecha_nacimiento: string | null;

  // Info bancaria (opcionales)
  banco: string | null;
  ejecutivo: string | null;
  sucursal: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  titular_cuenta: string | null;
  rut_titular: string | null;
  alias_transferencia: string | null;
  email_para_pagos: string | null;
  telefono_banco: string | null;

  comentarios: string | null;
  comentarios_generales: string | null;

  created_at?: string;
  updated_at?: string;
}

// =========================
// Payload para crear / actualizar Tutor
// (lo que se envía en POST/PUT)
// =========================
export interface TutorPayload {
  // Datos personales (mínimo exigido: nombres;
  // apellidos puede ir null si no se ingresa)
  nombres: string;
  apellidos: string | null;

  rut: string | null;
  email: string | null;
  telefono_movil: string | null;
  telefono_fijo: string | null;
  direccion: string | null;
  comuna?: string | null;
  region?: string | null;
  estado_civil?: string | null;
  ocupacion?: string | null;
  nacionalidad?: string | null;
  fecha_nacimiento?: string | null; // 'YYYY-MM-DD' si lo usas así

  // Info bancaria (opcionales)
  banco?: string | null;
  ejecutivo?: string | null;
  sucursal?: string | null;
  tipo_cuenta?: string | null;
  numero_cuenta?: string | null;
  titular_cuenta?: string | null;
  rut_titular?: string | null;
  alias_transferencia?: string | null;
  email_para_pagos?: string | null;
  telefono_banco?: string | null;

  // Comentarios / notas
  comentarios?: string | null;
  comentarios_generales?: string | null;

  // Campo que estás usando en el formulario
  notas?: string | null;
}

// =========================
// Listado / paginación
// =========================
export interface TutorListMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface TutorListResponse {
  data: Tutor[];
  meta?: TutorListMeta;
}

export interface TutorFilters {
  search?: string;
  page?: number;
  per_page?: number;
}
