export type BudgetStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface BudgetItemInput {
  sort_order?: number;
  name: string;
  description?: string;
  qty: number;
  unit_price: number;
  discount?: number;
  tax_rate?: number;
}
export type BudgetItem = {
  id: number;
  sort_order: number;
  name: string;
  description?: string | null;
  qty: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
};

export interface BudgetInput {
  patient_id?: number | null;
  tutor_id?: number | null;
  consultation_id?: number | null;

  title?: string | null;
  status?: BudgetStatus;
  currency?: string;
  valid_until?: string | null;

  notes?: string | null;
  terms?: string | null;

  items: BudgetItemInput[];
}

export interface Budget {
  id: number;
  code: string;
  title?: string | null;
  status: BudgetStatus;
  currency: string;
  valid_until?: string | null;

  subtotal: number;
  tax_total: number;
  discount_total: number;
  total: number;

  patient_id?: number | null;
  tutor_id?: number | null;
  consultation_id?: number | null;

  items?: any[];
}
