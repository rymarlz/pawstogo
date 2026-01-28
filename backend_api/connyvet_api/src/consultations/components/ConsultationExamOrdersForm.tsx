// src/consultations/components/ConsultationExamOrdersForm.tsx
import type { ConsultationExamOrder } from '../types';

type Props = {
  value: ConsultationExamOrder[];
  onChange: (next: ConsultationExamOrder[]) => void;
};

function emptyExam(nextOrder: number): ConsultationExamOrder {
  return {
    exam_name: '',
    priority: 'normal',
    status: 'requested',
    notes: '',
    sort_order: nextOrder,
  };
}

function normalizeSort(rows: ConsultationExamOrder[]) {
  return rows.map((r, i) => ({ ...r, sort_order: i }));
}

export function ConsultationExamOrdersForm({ value, onChange }: Props) {
  const rows = Array.isArray(value) ? value : [];

  function updateRow(idx: number, patch: Partial<ConsultationExamOrder>) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(normalizeSort(next));
  }

  function addRow() {
    const next = [...rows, emptyExam(rows.length)];
    onChange(normalizeSort(next));
  }

  function removeRow(idx: number) {
    const next = rows.filter((_, i) => i !== idx);
    onChange(normalizeSort(next));
  }

  return (
    <div className="card">
      <div className="mb-3 flex flex-col gap-1">
        <p className="text-sm font-semibold text-slate-800">
          Exámenes complementarios
        </p>
        <p className="text-xs text-slate-500">
          Solicitudes de laboratorio / imagenología asociadas a esta consulta.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[880px] w-full border-collapse text-xs">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-3 py-2 text-left">Examen *</th>
              <th className="px-3 py-2 text-left">Prioridad</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Observaciones</th>
              <th className="px-3 py-2 text-right">Acción</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={5}>
                  No hay exámenes solicitados.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-200 last:border-b-0"
                >
                  <td className="px-3 py-2">
                    <input
                      className="input"
                      value={r.exam_name ?? ''}
                      onChange={e =>
                        updateRow(idx, { exam_name: e.target.value })
                      }
                      placeholder="Ej: Hemograma"
                    />
                  </td>

                  <td className="px-3 py-2">
                    <select
                      className="input"
                      value={r.priority ?? 'normal'}
                      onChange={e =>
                        updateRow(idx, { priority: e.target.value as any })
                      }
                    >
                      <option value="normal">Normal</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </td>

                  <td className="px-3 py-2">
                    <select
                      className="input"
                      value={r.status ?? 'requested'}
                      onChange={e =>
                        updateRow(idx, { status: e.target.value as any })
                      }
                    >
                      <option value="requested">Solicitado</option>
                      <option value="done">Realizado</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </td>

                  <td className="px-3 py-2">
                    <input
                      className="input"
                      value={r.notes ?? ''}
                      onChange={e => updateRow(idx, { notes: e.target.value })}
                      placeholder="Ej: ayuno 8h"
                    />
                  </td>

                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{
                        fontSize: '11px',
                        padding: '0.35rem 0.8rem',
                        color: '#b91c1c',
                      }}
                      onClick={() => removeRow(idx)}
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
        <button type="button" className="btn" onClick={addRow}>
          + Agregar examen
        </button>
      </div>
    </div>
  );
}
