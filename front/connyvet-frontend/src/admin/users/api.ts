// src/users/api.ts
import { api } from '../../lib/api';
import type {
  AdminUser,
  AdminUserFilters,
  UserRole,
} from './types';

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

/**
 * Construye el querystring a partir de los filtros.
 * Ej: ?search=ana&role=doctor&active=true&page=1
 */
function buildQuery(filters: AdminUserFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.search && filters.search.trim() !== '') {
    params.set('search', filters.search.trim());
  }

  if (filters.role) {
    params.set('role', filters.role);
  }

  if (filters.active && filters.active !== 'all') {
    // 'true' | 'false' -> "1" | "0" para el backend
    params.set('active', filters.active === 'true' ? '1' : '0');
  }

  if (filters.page) {
    params.set('page', String(filters.page));
  }

  if (filters.per_page) {
    params.set('per_page', String(filters.per_page));
  }

  const q = params.toString();
  return q ? `?${q}` : '';
}

/**
 * Lista paginada de usuarios internos.
 * GET /api/v1/admin/users
 */
export async function fetchUsers(
  token: string | null,
  filters: AdminUserFilters = {},
): Promise<PaginatedResponse<AdminUser>> {
  const query = buildQuery(filters);

  const res = await api.get<PaginatedResponse<AdminUser>>(
    `/admin/users${query}`,
    token,
  );

  return res;
}


export interface UserPayload {
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  active: boolean;
  password?: string;
  password_confirmation?: string;
}

/**
 * Crear usuario interno.
 * POST /api/v1/admin/users
 * Respuesta esperada: { message: string, data: AdminUser }
 */
export async function createUser(
  token: string | null,
  payload: UserPayload,
): Promise<AdminUser> {
  const res = await api.post<{ message: string; data: AdminUser }>(
    '/admin/users',
    payload,
    token,
  );
  return res.data;
}

/**
 * Actualizar usuario interno.
 * PUT /api/v1/admin/users/{id}
 */
export async function updateUser(
  token: string | null,
  id: number,
  payload: Partial<UserPayload>,
): Promise<AdminUser> {
  const res = await api.put<{ message: string; data: AdminUser }>(
    `/admin/users/${id}`,
    payload,
    token,
  );
  return res.data;
}

/**
 * Eliminar usuario interno.
 * DELETE /api/v1/admin/users/{id}
 */
export async function deleteUser(
  id: number,
  token: string | null,
  
): Promise<void> {
  await api.del<{}>(`/admin/users/${id}`, token);
}

// Obtener un usuario concreto
export async function getUser(
  token: string | null,
  id: number,
): Promise<AdminUser> {
  const res = await api.get<{ data: AdminUser }>(
    `/admin/users/${id}`,
    token,
  );
  return res.data;
}
