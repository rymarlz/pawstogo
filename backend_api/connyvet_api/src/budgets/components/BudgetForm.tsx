import { useMemo, useState } from 'react';
import type { BudgetInput, BudgetItemInput, BudgetStatus } from '../types';

const emptyItem = (): BudgetItemInput => ({
  sort_order: 0,
  name: '',
  description: '',
  qty: 1,
  unit_price: 0,
  discount: 0,
  tax_rate: 19,
});

export function BudgetForm({
  initial,
  onSubmit,
  submitLabel = 'Guardar',
}: {
  initial: BudgetInput;
  onSubmit: (payload: BudgetInput) => Promise<void>;
  submitLabel?: string;
}) {
const [values, setValues] = useState<BudgetInput>(() => {
  const base: BudgetInput = {
    currency: 'CLP',
    status: 'draft',
    items: [emptyItem()],
  };

  // normaliza items del initial
  const normalizedItems =
    initial.items && initial.items.length ? initial.items : [emptyItem()];

  return {
    ...base,
    ...initial,
    items: normalizedItems, // solo una vez
  };
});


  const totals = useMemo(() => {
    const items = values.items ?? [];
    let subtotal = 0;
    let tax = 0;
    let total = 0;

    for (const it of items) {
      const qty = Number(it.qty ?? 0);
      const unit = Number(it.unit_price ?? 0);
      const disc = Number(it.discount ?? 0);
      const rate = Number(it.tax_rate ?? 0);

      const lineSubtotal = Math.max(0, qty * unit - disc);
      const lineTax = lineSubtotal * (rate / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      tax += lineTax;
      total += lineTotal;
    }

    return {
      subtotal: Math.round(subtotal),
      tax: Math.round(tax),
      total: Math.round(total),
    };
  }, [values.items]);

  function setItem(idx: number, patch: Partial<BudgetItemInput>) {
    setValues((v) => {
      const items = [...(v.items ?? [])];
      items[idx] = { ...items[idx], ...patch };
      return { ...v, items };
    });
  }

  return (
    <form
      className="card space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSubmit(values);
      }}
    >
      <div className="flex gap-3">
        <div style={{ flex: 2 }}>
          <div className="muted">Título</div>
          <input
            value={values.title ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            placeholder="Ej: Control + Vacuna + Insumos"
          />
        </div>

        <div style={{ width: 200 }}>
          <div className="muted">Estado</div>
          <select
            value={values.status ?? 'draft'}
            onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as BudgetStatus }))}
          >
            <option value="draft">draft</option>
            <option value="sent">sent</option>
            <option value="accepted">accepted</option>
            <option value="rejected">rejected</option>
            <option value="expired">expired</option>
          </select>
        </div>

        <div style={{ width: 140 }}>
          <div className="muted">Moneda</div>
          <input
            value={values.currency ?? 'CLP'}
            onChange={(e) => setValues((v) => ({ ...v, currency: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div style={{ width: 220 }}>
          <div className="muted">Válido hasta</div>
          <input
            type="date"
            value={values.valid_until ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, valid_until: e.target.value || null }))}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div className="muted">Notas</div>
          <input
            value={values.notes ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            placeholder="Notas internas / observaciones"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3>Ítems</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setValues((v) => ({ ...v, items: [...(v.items ?? []), emptyItem()] }))}
          >
            + Agregar ítem
          </button>
        </div>

        <div className="space-y-2" style={{ marginTop: 10 }}>
          {(values.items ?? []).map((it, idx) => (
            <div key={idx} className="card" style={{ padding: 12 }}>
              <div className="flex gap-2">
                <div style={{ flex: 2 }}>
                  <div className="muted">Nombre</div>
                  <input value={it.name} onChange={(e) => setItem(idx, { name: e.target.value })} />
                </div>
                <div style={{ width: 120 }}>
                  <div className="muted">Cant.</div>
                  <input
                    type="number"
                    step="0.01"
                    value={it.qty}
                    onChange={(e) => setItem(idx, { qty: Number(e.target.value) })}
                  />
                </div>
                <div style={{ width: 140 }}>
                  <div className="muted">P.Unit</div>
                  <input
                    type="number"
                    step="0.01"
                    value={it.unit_price}
                    onChange={(e) => setItem(idx, { unit_price: Number(e.target.value) })}
                  />
                </div>
                <div style={{ width: 140 }}>
                  <div className="muted">Desc.</div>
                  <input
                    type="number"
                    step="0.01"
                    value={it.discount ?? 0}
                    onChange={(e) => setItem(idx, { discount: Number(e.target.value) })}
                  />
                </div>
                <div style={{ width: 100 }}>
                  <div className="muted">IVA%</div>
                  <input
                    type="number"
                    step="0.01"
                    value={it.tax_rate ?? 0}
                    onChange={(e) => setItem(idx, { tax_rate: Number(e.target.value) })}
                  />
                </div>

                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setValues((v) => {
                      const items = [...(v.items ?? [])];
                      items.splice(idx, 1);
                      return { ...v, items: items.length ? items : [emptyItem()] };
                    });
                  }}
                >
                  Quitar
                </button>
              </div>

              <div style={{ marginTop: 8 }}>
                <div className="muted">Descripción</div>
                <input
                  value={it.description ?? ''}
                  onChange={(e) => setItem(idx, { description: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 12 }}>
        <div className="flex" style={{ justifyContent: 'flex-end' }}>
          <div style={{ width: 280 }}>
            <div className="flex justify-between"><span className="muted">Subtotal</span><strong>${totals.subtotal}</strong></div>
            <div className="flex justify-between"><span className="muted">IVA</span><strong>${totals.tax}</strong></div>
            <div className="flex justify-between"><span className="muted">Total</span><strong>${totals.total}</strong></div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
