// src/admin/types.ts

// mismos roles que usas en DashboardLayout
export type UserRole = 'admin' | 'doctor' | 'asistente' | 'tutor';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  active: boolean;        // boolean plano para el front
  // puedes agregar created_at, updated_at, etc. como opcionales si quieres
  // created_at?: string;
  // updated_at?: string;
}

export interface PaginatedMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AdminUserFilters {
  search?: string;
  role?: UserRole | '';
  active?: 'all' | 'true' | 'false';
  page?: number;
  per_page?: number;
}
