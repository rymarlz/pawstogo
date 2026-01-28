// src/consultations/components/ConsultationPrescriptionForm.tsx
import type {
  ConsultationPrescription,
  ConsultationPrescriptionItem,
} from '../types';

type Props = {
  value: ConsultationPrescription;
  onChange: (next: ConsultationPrescription) => void;
};

function emptyItem(): ConsultationPrescriptionItem {
  return {
    drug_name: '',
    presentation: '',
    dose: '',
    frequency: '',
    duration_days: null,
    route: '',
    instructions: '',
    sort_order: 0,
  };
}

export function ConsultationPrescriptionForm({ value, onChange }: Props) {
  const items = Array.isArray(value.items) ? value.items : [];

  function updateItem(idx: number, patch: Partial<ConsultationPrescriptionItem>) {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange({ ...value, items: next });
  }

  function addItem() {
    const next = [...items, { ...emptyItem(), sort_order: items.length }];
    onChange({ ...value, items: next });
  }

  function removeItem(idx: number) {
    const next = items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sort_order: i }));
    onChange({ ...value, items: next });
  }

  return (
    <div className="card">
      <div className="mb-3 flex flex-col gap-1">
        <p className="text-sm font-semibold text-slate-800">Receta</p>
        <p className="text-xs text-slate-500">
          Agrega los fármacos indicados en esta consulta. (Se imprimen en PDF).
        </p>
      </div>

      <div className="mb-3 grid gap-2">
        <label className="text-xs font-medium text-slate-500">
          Indicaciones generales (opcional)
        </label>
        <textarea
          className="input min-h-[70px]"
          value={value.notes ?? ''}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="Ej: reposo, con comida, no mojar, control en 7 días…"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[980px] w-full border-collapse text-xs">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-3 py-2 text-left">Fármaco *</th>
              <th className="px-3 py-2 text-left">Presentación</th>
              <th className="px-3 py-2 text-left">Dosis</th>
              <th className="px-3 py-2 text-left">Frecuencia</th>
              <th className="px-3 py-2 text-left">Duración (días)</th>
              <th className="px-3 py-2 text-left">Vía</th>
              <th className="px-3 py-2 text-left">Indicaciones</th>
              <th className="px-3 py-2 text-right">Acción</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={8}>
                  No hay fármacos agregados.
                </td>
              </tr>
            ) : (
              items.map((it, idx) => (
                <tr key={idx} className="border-b border-slate-200 last:border-b-0">
                  <td className="px-3 py-2">
                    <input
                      className="input"
                      value={it.drug_name ?? ''}
                      onChange={(e) => updateItem(idx, { drug_name: e.target.value })}
                      placeholder="Ej: Amoxicilina"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input"
                      value={it.presentation ?? ''}
                      onChange={(e) => updateItem(idx, { presentation: e.target.value })}
                      placeholder="Ej: 250mg/5ml"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input"
                      value={it.dose ?? ''}
                      onChange={(e) => updateItem(idx, { dose: e.target.value })}
                      placeholder="Ej: 10 mg/kg"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input"
                      value={it.frequency ?? ''}
                      onChange={(e) => updateItem(idx, { frequency: e.target.value })}
                      placeholder="Ej: c/12h"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      className="input"
                      value={it.duration_days ?? ''}
                      onChange={(e) =>
                        updateItem(idx, {
                          duration_days: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      placeholder="7"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input"
                      value={it.route ?? ''}
                      onChange={(e) => updateItem(idx, { route: e.target.value })}
                      placeholder="Ej: oral"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input"
                      value={it.instructions ?? ''}
                      onChange={(e) => updateItem(idx, { instructions: e.target.value })}
                      placeholder="Ej: con comida"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: '11px', padding: '0.35rem 0.8rem', color: '#b91c1c' }}
                      onClick={() => removeItem(idx)}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex justify-end">
        <button type="button" className="btn" onClick={addItem}>
          + Agregar fármaco
        </button>
      </div>

      <p className="mt-2 text-[11px] text-slate-400">
        Tip: si un fármaco no tiene duración, deja el campo en blanco.
      </p>
    </div>
  );
}
