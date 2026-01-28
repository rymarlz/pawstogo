// src/admin/api.ts
import type {
  AdminUser,
  AdminUserFilters,
  PaginatedMeta,
} from './types';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? '/api/v1';

export interface PaginatedUsersResponse {
  data: AdminUser[];
  meta: PaginatedMeta;
}

// arma query string desde los filtros
function buildQuery(filters: AdminUserFilters): string {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.role) params.set('role', filters.role);
  if (filters.active && filters.active !== 'all') {
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

export async function fetchUsers(
  token: string,
  filters: AdminUserFilters,
): Promise<PaginatedUsersResponse> {
  const qs = buildQuery(filters);

  const res = await fetch(`${API_BASE_URL}/admin/users${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    let msg = 'Error al cargar usuarios.';
    try {
      const data = await res.json();
      msg = data?.message ?? msg;
    } catch {
      // ignore JSON error
    }
    throw new Error(msg);
  }

  // asume estructura { data: AdminUser[], meta: {...} }
  const json = await res.json();
  return json as PaginatedUsersResponse;
}

export async function deleteUser(id: number, token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    let msg = 'Error al eliminar usuario.';
    try {
      const data = await res.json();
      msg = data?.message ?? msg;
    } catch {
      // ignore JSON error
    }
    throw new Error(msg);
  }
}
