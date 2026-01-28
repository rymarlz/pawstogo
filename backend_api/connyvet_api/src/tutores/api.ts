// src/tutores/api.ts
import { apiFetch } from '../api';
import type {
  Tutor,
  TutorListResponse,
  TutorFilters,
  TutorListMeta,
} from './types';

const BASE = '/tutores';

function normalizeList(raw: any): TutorListResponse {
  if (Array.isArray(raw)) return { data: raw as Tutor[] };

  if (raw && Array.isArray(raw.data)) {
    return { data: raw.data as Tutor[], meta: raw.meta as TutorListMeta | undefined };
  }

  if (raw?.data && Array.isArray(raw.data.data)) {
    return {
      data: raw.data.data as Tutor[],
      meta: (raw.data.meta as TutorListMeta | undefined) ?? (raw.meta as TutorListMeta | undefined),
    };
  }

  if (raw?.data?.data && Array.isArray(raw.data.data.data)) {
    return {
      data: raw.data.data.data as Tutor[],
      meta:
        (raw.data.data.meta as TutorListMeta | undefined) ??
        (raw.data.meta as TutorListMeta | undefined) ??
        (raw.meta as TutorListMeta | undefined),
    };
  }

  console.warn('[tutoresApi.list] No se pudo normalizar la respuesta', raw);
  return { data: [] };
}

function normalizeOne(raw: any): Tutor {
  return raw?.data ? (raw.data as Tutor) : (raw as Tutor);
}

export const tutoresApi = {
  async list(filters: TutorFilters = {}, token?: string | null): Promise<TutorListResponse> {
    const params: Record<string, any> = {};
    if (filters.search) params.s = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.per_page) params.per_page = filters.per_page;

    const raw = await apiFetch<any>(BASE, { method: 'GET', token, params });
    return normalizeList(raw);
  },

  async get(id: number, token?: string | null): Promise<Tutor> {
    const raw = await apiFetch<any>(`${BASE}/${id}`, { method: 'GET', token });
    return normalizeOne(raw);
  },

  async create(payload: Partial<Tutor>, token?: string | null): Promise<Tutor> {
    const raw = await apiFetch<any>(BASE, { method: 'POST', token, data: payload });
    return normalizeOne(raw);
  },

  async update(id: number, payload: Partial<Tutor>, token?: string | null): Promise<Tutor> {
    const raw = await apiFetch<any>(`${BASE}/${id}`, { method: 'PUT', token, data: payload });
    return normalizeOne(raw);
  },

  async delete(id: number, token?: string | null): Promise<void> {
    await apiFetch<void>(`${BASE}/${id}`, { method: 'DELETE', token });
  },
};

export async function fetchTutores(token: string, filters: TutorFilters = {}): Promise<TutorListResponse> {
  return tutoresApi.list(filters, token);
}
