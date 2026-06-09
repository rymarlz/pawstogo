import { apiFetch } from '../api';
import type {
  PaginatedWaitingRoomResponse,
  WaitingRoomEntry,
  WaitingRoomFilters,
  WaitingRoomPayload,
  WaitingRoomUpdatePayload,
} from './types';

const BASE = '/waiting-room-entries';

function normalizeOne(raw: unknown): WaitingRoomEntry {
  const r = raw as { data?: WaitingRoomEntry };
  return r?.data ?? (raw as WaitingRoomEntry);
}

function normalizeList(raw: unknown): PaginatedWaitingRoomResponse {
  const r = raw as PaginatedWaitingRoomResponse;
  if (Array.isArray(r)) {
    return { data: r as WaitingRoomEntry[] };
  }
  return {
    data: Array.isArray(r?.data) ? r.data : [],
    meta: r?.meta,
  };
}

export async function fetchWaitingRoomEntries(
  token: string,
  filters: WaitingRoomFilters = {},
): Promise<PaginatedWaitingRoomResponse> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.status) params.status = filters.status;
  if (filters.priority) params.priority = filters.priority;
  if (filters.include_history) params.include_history = true;
  if (filters.attended_today) params.attended_today = true;
  if (filters.page) params.page = filters.page;
  if (filters.per_page) params.per_page = filters.per_page;

  const raw = await apiFetch<unknown>(BASE, { method: 'GET', token, params });
  return normalizeList(raw);
}

export async function createWaitingRoomEntry(
  token: string,
  payload: WaitingRoomPayload,
): Promise<WaitingRoomEntry> {
  const raw = await apiFetch<unknown>(BASE, {
    method: 'POST',
    token,
    data: payload,
  });
  return normalizeOne(raw);
}

export async function updateWaitingRoomEntry(
  token: string,
  id: number,
  payload: WaitingRoomUpdatePayload,
): Promise<WaitingRoomEntry> {
  const raw = await apiFetch<unknown>(`${BASE}/${id}`, {
    method: 'PATCH',
    token,
    data: payload,
  });
  return normalizeOne(raw);
}

export async function startWaitingRoomEntry(
  token: string,
  id: number,
): Promise<WaitingRoomEntry> {
  const raw = await apiFetch<unknown>(`${BASE}/${id}/start`, {
    method: 'PATCH',
    token,
  });
  return normalizeOne(raw);
}

export async function attendWaitingRoomEntry(
  token: string,
  id: number,
): Promise<WaitingRoomEntry> {
  const raw = await apiFetch<unknown>(`${BASE}/${id}/attend`, {
    method: 'PATCH',
    token,
  });
  return normalizeOne(raw);
}

export async function cancelWaitingRoomEntry(
  token: string,
  id: number,
): Promise<WaitingRoomEntry> {
  const raw = await apiFetch<unknown>(`${BASE}/${id}/cancel`, {
    method: 'PATCH',
    token,
  });
  return normalizeOne(raw);
}
