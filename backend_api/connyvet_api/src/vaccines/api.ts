// src/vaccines/api.ts
import type {
  Vaccine,
  VaccineFilters,
  VaccinePayload,
  VaccineApplication,
  VaccineApplicationFilters,
  PaginatedResponse,
} from './types';
import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '../api/apiClient';

// Wrapper genérico para este módulo
export async function apiFetch<T>(
  path: string,
  options: AxiosRequestConfig & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await apiClient.request<T>({
    url: path,
    ...rest,
    headers: {
      ...(headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return res.data as T;
}

// Helpers para crear querystring desde filtros
function buildQuery(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      Number.isNaN(value)
    ) {
      return;
    }
    searchParams.append(key, String(value));
  });

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// ===========================
// Vacunas (catálogo)
// ===========================

export async function fetchVaccines(
  token: string,
  filters: VaccineFilters = {},
): Promise<PaginatedResponse<Vaccine>> {
  const query = buildQuery(filters);

  return apiFetch<PaginatedResponse<Vaccine>>(`/vaccines${query}`, {
    method: 'GET',
    token,
  });
}

export async function fetchVaccine(
  token: string,
  id: number,
): Promise<{ data: Vaccine }> {
  return apiFetch<{ data: Vaccine }>(`/vaccines/${id}`, {
    method: 'GET',
    token,
  });
}

export async function createVaccine(
  token: string,
  payload: VaccinePayload,
): Promise<{ message: string; data: Vaccine }> {
  return apiFetch<{ message: string; data: Vaccine }>(`/vaccines`, {
    method: 'POST',
    token,
    data: payload,
  });
}

export async function updateVaccine(
  token: string,
  id: number,
  payload: VaccinePayload,
): Promise<{ message: string; data: Vaccine }> {
  return apiFetch<{ message: string; data: Vaccine }>(`/vaccines/${id}`, {
    method: 'PUT',
    token,
    data: payload,
  });
}

export async function deleteVaccine(
  token: string,
  id: number,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/vaccines/${id}`, {
    method: 'DELETE',
    token,
  });
}

// ===========================
// Aplicaciones de vacuna
// ===========================

export async function fetchVaccineApplications(
  token: string,
  filters: VaccineApplicationFilters = {},
): Promise<PaginatedResponse<VaccineApplication>> {
  const query = buildQuery(filters);

  return apiFetch<PaginatedResponse<VaccineApplication>>(
    `/vaccine-applications${query}`,
    {
      method: 'GET',
      token,
    },
  );
}

export async function fetchVaccineApplication(
  token: string,
  id: number,
): Promise<{ data: VaccineApplication }> {
  return apiFetch<{ data: VaccineApplication }>(
    `/vaccine-applications/${id}`,
    {
      method: 'GET',
      token,
    },
  );
}

export async function createVaccineApplication(
  token: string,
  payload: Partial<VaccineApplication>,
): Promise<{ message: string; data: VaccineApplication }> {
  return apiFetch<{ message: string; data: VaccineApplication }>(
    `/vaccine-applications`,
    {
      method: 'POST',
      token,
      data: payload,
    },
  );
}

export async function updateVaccineApplication(
  token: string,
  id: number,
  payload: Partial<VaccineApplication>,
): Promise<{ message: string; data: VaccineApplication }> {
  return apiFetch<{ message: string; data: VaccineApplication }>(
    `/vaccine-applications/${id}`,
    {
      method: 'PUT',
      token,
      data: payload,
    },
  );
}

export async function deleteVaccineApplication(
  token: string,
  id: number,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/vaccine-applications/${id}`, {
    method: 'DELETE',
    token,
  });
}

// ===========================
// Próximas vacunas para dashboard
// ===========================

export async function fetchUpcomingVaccinesForDashboard(
  token: string,
  limit = 5,
): Promise<{ data: VaccineApplication[] }> {
  const query = buildQuery({ limit });

  return apiFetch<{ data: VaccineApplication[] }>(
    `/dashboard/vaccines/upcoming${query}`,
    {
      method: 'GET',
      token,
    },
  );
}
