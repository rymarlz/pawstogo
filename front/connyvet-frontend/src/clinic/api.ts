// src/clinic/api.ts
import type {
  Patient,
  PatientFilters,
  PatientPayload,
  PaginatedResponse,
} from './types';

// alias de paginación específico para pacientes
export type PaginatedPatientsResponse = PaginatedResponse<Patient>;

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? '/api/v1';

// Backend: /api/v1/patients
const PATIENTS_BASE = `${API_BASE_URL}/patients`;

// ⚠️ Importante: sin Content-Type aquí, para que funcione con FormData
function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
}

function buildQuery(filters: PatientFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.species) params.set('species', filters.species);

  if (filters.active && filters.active !== 'all') {
    // aquí seguimos tu convención de backend: 'active' | 'inactive'
    params.set('active', filters.active);
  }

  if (typeof filters.page === 'number') {
    params.set('page', String(filters.page));
  }
  if (typeof filters.per_page === 'number') {
    params.set('per_page', String(filters.per_page));
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// ========================
// LISTAR PACIENTES
// ========================
export async function fetchPatients(
  token: string,
  filters: PatientFilters,
): Promise<PaginatedPatientsResponse> {
  const qs = buildQuery(filters);

  const res = await fetch(`${PATIENTS_BASE}${qs}`, {
    headers: authHeaders(token),
  });

  if (!res.ok) {
    let msg = 'Error al cargar pacientes.';
    try {
      const data = await res.json();
      msg = data?.message ?? msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await res.json();
  // asumo { data: Patient[], meta: {...} }
  return json as PaginatedPatientsResponse;
}

// ========================
// OBTENER UN PACIENTE
// ========================
export async function fetchPatient(
  token: string,
  id: number | string,
): Promise<Patient> {
  const res = await fetch(`${PATIENTS_BASE}/${id}`, {
    headers: authHeaders(token),
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Paciente no encontrado.');
    }
    let msg = 'Error al cargar el paciente.';
    try {
      const data = await res.json();
      msg = data?.message ?? msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = await res.json();
  // puede venir { data: {...} } o directo {...}
  return (json.data ?? json) as Patient;
}

// ========================
// CREAR PACIENTE (FormData + foto)
// ========================
export async function createPatient(
  token: string,
  payload: PatientPayload,
  photoFile?: File | null,
): Promise<Patient> {
  const form = buildPatientFormData(payload, photoFile);

  const res = await fetch(PATIENTS_BASE, {
    method: 'POST',
    headers: authHeaders(token), // sin Content-Type, lo pone el navegador
    body: form,
  });

  if (!res.ok) {
    if (res.status === 422) {
      const data = await res.json();
      const err = new Error('VALIDATION_ERROR');
      (err as any).validation = data.errors;
      (err as any).messageApi = data.message;
      throw err;
    }

    let msg = 'Error al crear paciente.';
    try {
      const data = await res.json();
      msg = data?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  const json = await res.json();
  return (json.data ?? json) as Patient;
}

// ========================
// ACTUALIZAR PACIENTE (FormData + foto)
// ========================
export async function updatePatient(
  token: string,
  id: number | string,
  payload: PatientPayload,
  photoFile?: File | null,
): Promise<Patient> {
  const form = buildPatientFormData(payload, photoFile);

  const res = await fetch(`${PATIENTS_BASE}/${id}`, {
    method: 'POST', // Laravel: para file + PUT usa override
    headers: {
      ...authHeaders(token),
      'X-HTTP-Method-Override': 'PUT',
    },
    body: form,
  });

  if (!res.ok) {
    if (res.status === 422) {
      const data = await res.json();
      const err = new Error('VALIDATION_ERROR');
      (err as any).validation = data.errors;
      (err as any).messageApi = data.message;
      throw err;
    }

    let msg = 'Error al actualizar paciente.';
    try {
      const data = await res.json();
      msg = data?.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  const json = await res.json();
  return (json.data ?? json) as Patient;
}

// ========================
// ELIMINAR / DESACTIVAR PACIENTE
// ========================
export async function deletePatient(
  token: string,
  id: number | string,
): Promise<void> {
  const res = await fetch(`${PATIENTS_BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });

  if (!res.ok) {
    let msg = 'Error al eliminar paciente.';
    try {
      const data = await res.json();
      msg = data?.message ?? msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

// ========================
// helper para armar FormData
// ========================
function buildPatientFormData(
  payload: PatientPayload,
  photoFile?: File | null,
): FormData {
  const form = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    // boolean -> "1"/"0"
    if (typeof value === 'boolean') {
      form.append(key, value ? '1' : '0');
    } else {
      form.append(key, String(value));
    }
  });

  if (photoFile) {
    form.append('photo', photoFile);
  }

  return form;
}
