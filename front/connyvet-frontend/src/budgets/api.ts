// src/budgets/api.ts
import { apiFetch } from '../api';

export type BudgetStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export function budgetPdfUrl(id: number, token: string) {
  const base = import.meta.env.VITE_API_URL ?? '/api/v1';
  return `${base}/budgets/${id}/pdf?token=${encodeURIComponent(token)}`;
}

export async function fetchBudgets(
  token: string,
  params?: Record<string, any>,
) {
  return apiFetch('/budgets', { token, params });
}

export async function createBudget(token: string, payload: any) {
  return apiFetch('/budgets', { token, method: 'POST', data: payload });
}

export async function getBudget(token: string, id: number) {
  return apiFetch(`/budgets/${id}`, { token });
}

export async function updateBudget(token: string, id: number, payload: any) {
  return apiFetch(`/budgets/${id}`, { token, method: 'PUT', data: payload });
}

export async function deleteBudget(token: string, id: number) {
  return apiFetch(`/budgets/${id}`, { token, method: 'DELETE' });
}

export async function sendBudgetEmail(token: string, id: number, emailTo: string) {
  return apiFetch(`/budgets/${id}/send-email`, {
    token,
    method: 'POST',
    data: { to: emailTo },
  });
}
