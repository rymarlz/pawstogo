// src/lib/auth.ts
import { api } from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  // agrega lo que devuelves en tu AuthController (locale, timezone, etc.)
}

export interface AuthResponse {
  user: User;
  token: string;
}

export async function loginRequest(
  email: string,
  password: string
): Promise<AuthResponse> {
  // ANTES: '/login'
  return api.post<AuthResponse>('/auth/login', { email, password });
}

export async function registerRequest(params: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<AuthResponse> {
  // ANTES: '/register'
  return api.post<AuthResponse>('/auth/register', params);
}

export async function meRequest(token: string): Promise<User> {
  return api.get<User>('/auth/me', token);
}

export async function logoutRequest(token: string): Promise<void> {
  await api.post<null>('/auth/logout', {}, token);
}
