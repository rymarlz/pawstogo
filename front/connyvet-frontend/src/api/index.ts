// src/api/index.ts

/** Respuesta de error normalizada de la API (message y/o errors de validación). */
export interface ApiError {
  message?: string;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
}

export type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string | null;
  /** Cuerpo JSON (objeto o array). Preferir tipos concretos en lugar de any. */
  data?: unknown;
  /** Alias de data para compatibilidad. */
  body?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/** Devuelve un mensaje mostrable al usuario a partir de un ApiError. */
export function getApiErrorMessage(err: ApiError): string {
  if (err.message && String(err.message).trim()) return String(err.message).trim();
  if (err.errors && typeof err.errors === 'object') {
    const first = Object.values(err.errors).flat().find(Boolean);
    if (first) return String(first);
  }
  return 'Error en la solicitud';
}

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ??
  (import.meta as any).env?.VITE_API_URL ??
  'http://localhost:8000/api/v1';

export function joinUrl(base: string, path: string) {
  if (!path) return base;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
}

async function parseJsonSafe(res: Response) {
  const text = await res.text().catch(() => '');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/**
 * ✅ apiFetch SOLO JSON (NO subir archivos).
 * Para FormData usa fetch directo sin Content-Type.
 */
export async function apiFetch<T = any>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', token, data, body, params, headers = {}, signal } = opts;

  // Construir URL con query parameters si existen
  let url = joinUrl(API_BASE_URL, path);
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    url += `?${searchParams.toString()}`;
  }

  // Usar body si está definido, sino data
  const requestBody = body !== undefined ? body : data;

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let fetchBody: BodyInit | undefined;
  if (requestBody !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(requestBody);
  }

  const res = await fetch(url, { method, headers: finalHeaders, body: fetchBody, signal });
  const json = await parseJsonSafe(res);

  if (!res.ok) {
    const apiError: ApiError = {
      message: typeof json?.message === 'string' ? json.message : undefined,
      errors: json?.errors && typeof json.errors === 'object' ? json.errors : undefined,
      ...json,
    };
    throw apiError;
  }
  return json as T;
}
