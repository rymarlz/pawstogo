// src/admin/types.ts

// Los mismos roles que maneja tu backend (User::ROLE_*)
export type UserRole = 'admin' | 'doctor' | 'asistente' | 'tutor';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  active: boolean;

  // opcionales, por si el backend los envía
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminUserFilters {
  search?: string;
  role?: UserRole | '';            // '' = todos
  active?: 'all' | 'true' | 'false';
  page?: number;
  per_page?: number;
}

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: PaginatedMeta;
}
