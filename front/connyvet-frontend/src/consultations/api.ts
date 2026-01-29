// src/consultations/api.ts
import { apiFetch, API_BASE_URL, joinUrl } from '../api';
import type {
  Consultation,
  ConsultationFilters,
  PaginatedResponse,
  ConsultationUpsertPayload,
  AttachmentDraft,
} from './types';

// ===========================
// LIST (paginado + filtros)
// ===========================
export async function fetchConsultations(
  token: string,
  filters: ConsultationFilters,
): Promise<PaginatedResponse<Consultation>> {
  const params = new URLSearchParams();

  if (filters.patient_id != null && String(filters.patient_id) !== '') params.set('patient_id', String(filters.patient_id));
  if (filters.tutor_id != null && String(filters.tutor_id) !== '') params.set('tutor_id', String(filters.tutor_id));
  if (filters.doctor_id != null && String(filters.doctor_id) !== '') params.set('doctor_id', String(filters.doctor_id));

  if (filters.status && filters.status !== 'all') params.set('status', String(filters.status));
  if (filters.visit_type) params.set('visit_type', filters.visit_type);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.search) params.set('search', filters.search);

  params.set('page', String(filters.page ?? 1));
  params.set('per_page', String(filters.per_page ?? 20));

  return apiFetch<PaginatedResponse<Consultation>>(`/consultations?${params.toString()}`, {
    method: 'GET',
    token,
  });
}

// ===========================
// DETAIL
// ===========================
export async function fetchConsultation(token: string, id: number): Promise<Consultation> {
  const res = await apiFetch<{ data: Consultation }>(`/consultations/${id}`, { method: 'GET', token });
  return res.data;
}

// ===========================
// CREATE
// ===========================
export async function createConsultation(token: string, payload: ConsultationUpsertPayload): Promise<Consultation> {
  const res = await apiFetch<{ data: Consultation }>(`/consultations`, {
    method: 'POST',
    token,
    data: payload,
  });
  return res.data;
}

// ===========================
// UPDATE
// ===========================
export async function updateConsultation(
  token: string,
  id: number,
  payload: ConsultationUpsertPayload,
): Promise<Consultation> {
  const res = await apiFetch<{ data: Consultation }>(`/consultations/${id}`, {
    method: 'PATCH',
    token,
    data: payload,
  });
  return res.data;
}

// ===========================
// DELETE
// ===========================
export async function deleteConsultation(token: string, id: number): Promise<void> {
  await apiFetch(`/consultations/${id}`, { method: 'DELETE', token });
}

// ===========================
// ✅ ATTACHMENTS (UPLOAD / DELETE)
// ===========================

// en algunos contexts instanceof File falla: validación más robusta
function isRealFile(v: any): v is File {
  return (
    v instanceof File ||
    (v &&
      typeof v === 'object' &&
      typeof v.name === 'string' &&
      typeof v.size === 'number' &&
      typeof v.type === 'string' &&
      typeof v.arrayBuffer === 'function')
  );
}

/**
 * POST /api/v1/consultations/{id}/attachments
 * multipart/form-data:
 *  - files[]: File
 *  - notes[]: string
 */
export async function uploadConsultationAttachments(
  token: string,
  consultationId: number,
  items: AttachmentDraft[],
) {
  if (!token) throw new Error('Sesión inválida (no hay token).');
  if (!consultationId) throw new Error('consultationId inválido.');

  if (!Array.isArray(items) || items.length === 0) {
    return { message: 'Sin adjuntos.' };
  }

  // ✅ DEBUG REAL (te va a decir si estás mandando strings/objetos en vez de File)
  const debug = items.map((x: any, i: number) => ({
    i,
    file_typeof: typeof x?.file,
    name: x?.file?.name,
    size: x?.file?.size,
    mime: x?.file?.type,
    isFile: isRealFile(x?.file),
    detail: x?.detail,
  }));
  console.log('[uploadConsultationAttachments] items debug:', debug);

  const badIndex = items.findIndex((x: any) => !isRealFile(x?.file));
  if (badIndex >= 0) {
    console.error('❌ Adjuntos inválidos. file NO es File real:', items[badIndex]);
    throw {
      message: `Adjunto inválido: files[${badIndex}] no es un archivo.`,
      errors: { [`files.${badIndex}`]: ['El archivo no es un File real.'] },
    };
  }

  const fd = new FormData();

  items.forEach((a: any, idx: number) => {
    const file: File = a.file;
    const label = (a.detail || file.name || `Archivo ${idx + 1}`).trim();

    // ✅ Laravel espera files[] y notes[]
    fd.append('files[]', file, file.name);
    fd.append('notes[]', label);
  });

  // ✅ URL ABSOLUTA: evita que quede pegado a /dashboard o a otro host
  const url = joinUrl(API_BASE_URL, `/consultations/${consultationId}/attachments`);

  // DEBUG: Verificar FormData antes de enviar
  console.log('[uploadConsultationAttachments] FormData entries:');
  for (const [key, value] of fd.entries()) {
    console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
  }
  console.log('[uploadConsultationAttachments] Sending to:', url);
  console.log('[uploadConsultationAttachments] Body is FormData:', fd instanceof FormData);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      // ❌ NO Content-Type - el navegador lo establece automáticamente con boundary
    },
    body: fd,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('[uploadConsultationAttachments] failed', res.status, data);
    throw data;
  }

  return data;
}

export async function deleteConsultationAttachment(
  token: string,
  consultationId: number,
  index: number,
): Promise<{ attachments_meta: any[] }> {
  const url = joinUrl(API_BASE_URL, `/consultations/${consultationId}/attachments/${index}`);

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw json;

  return { attachments_meta: json?.data?.attachments_meta ?? [] };
}
