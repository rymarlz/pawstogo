// src/lib/api.ts

// Base URL de la API Laravel (v1)
// En .env: VITE_API_URL=/api/v1
const API_URL =
  import.meta.env.VITE_API_URL ?? '/api/v1';

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

/**
 * Helper genérico para llamar a la API JSON.
 */
async function request<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const contentType =
    res.headers.get('content-type')?.toLowerCase() ?? '';
  const isJson = contentType.includes('application/json');

  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const error: ApiError = {
      status: res.status,
      message:
        (data && (data.message || data.error)) ||
        `Error ${res.status}`,
      errors: data?.errors,
    };
    throw error;
  }

  return data as T;
}

// src/lib/api.ts (ya lo tienes así)
export const api = {
  get: <T>(path: string, token?: string | null) =>
    request<T>(path, { method: 'GET', token }),
  post: <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'POST', body, token }),
  put:  <T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'PUT', body, token }),
  patch:<T>(path: string, body?: unknown, token?: string | null) =>
    request<T>(path, { method: 'PATCH', body, token }),
  del:  <T>(path: string, token?: string | null) =>
    request<T>(path, { method: 'DELETE', token }),
};

