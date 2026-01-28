// src/api/index.ts

export type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string | null;
  data?: any; // JSON body
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

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
  const { method = 'GET', token, data, headers = {}, signal } = opts;

  const url = joinUrl(API_BASE_URL, path);

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (data !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const res = await fetch(url, { method, headers: finalHeaders, body, signal });
  const json = await parseJsonSafe(res);

  if (!res.ok) throw json;
  return json as T;
}
