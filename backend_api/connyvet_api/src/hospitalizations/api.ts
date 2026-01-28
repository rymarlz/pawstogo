// src/hospitalizations/api.ts
import { apiFetch } from '../api'; // <- si tu index está en src/api/index.ts, este import funciona

import type {
  Hospitalization,
  HospitalizationFilters,
  PaginatedResponse,
} from './types';

function buildQueryString(filters: HospitalizationFilters = {}): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.append(key, String(value));
  });

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Lista paginada de internaciones / hospitalizaciones.
 * GET /api/v1/hospitalizations
 */
export async function fetchHospitalizations(
  token: string,
  filters: HospitalizationFilters = {},
): Promise<PaginatedResponse<Hospitalization>> {
  const qs = buildQueryString(filters);

  return apiFetch(`/hospitalizations${qs}`, {
    method: 'GET',
    token,
  });
}

/**
 * Obtiene una internación por ID.
 * GET /api/v1/hospitalizations/{id}
 */
export async function getHospitalization(
  token: string,
  id: number,
): Promise<Hospitalization> {
  return apiFetch(`/hospitalizations/${id}`, {
    method: 'GET',
    token,
  });
}

/**
 * Crea una internación.
 * POST /api/v1/hospitalizations
 */
export async function createHospitalization(
  token: string,
  payload: Partial<Hospitalization>,
): Promise<Hospitalization> {
  return apiFetch('/hospitalizations', {
    method: 'POST',
    token,
    body: payload, // <- usamos body, apiFetch lo traduce a data para axios
  });
}

/**
 * Actualiza una internación.
 * PUT /api/v1/hospitalizations/{id}
 */
export async function updateHospitalization(
  token: string,
  id: number,
  payload: Partial<Hospitalization>,
): Promise<Hospitalization> {
  return apiFetch(`/hospitalizations/${id}`, {
    method: 'PUT',
    token,
    body: payload, // <- igual aquí body
  });
}

/**
 * Elimina una internación.
 * DELETE /api/v1/hospitalizations/{id}
 */
export async function deleteHospitalization(
  token: string,
  id: number,
): Promise<void> {
  await apiFetch(`/hospitalizations/${id}`, {
    method: 'DELETE',
    token,
  });
}
