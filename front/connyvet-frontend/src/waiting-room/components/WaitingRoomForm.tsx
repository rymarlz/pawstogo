import { useEffect, useState } from 'react';
import { fetchPatients } from '../../clinic/api';
import type { Patient } from '../../clinic/types';
import { tutoresApi } from '../../tutores/api';
import type { Tutor } from '../../tutores/types';
import type { WaitingRoomPriority } from '../types';

export type WaitingRoomFormValues = {
  tutor_id: string;
  patient_id: string;
  reason: string;
  priority: WaitingRoomPriority;
  notes: string;
};

type Props = {
  token: string;
  submitting?: boolean;
  onSubmit: (values: WaitingRoomFormValues) => void;
  onCancel?: () => void;
};

export function WaitingRoomForm({
  token,
  submitting = false,
  onSubmit,
  onCancel,
}: Props) {
  const [values, setValues] = useState<WaitingRoomFormValues>({
    tutor_id: '',
    patient_id: '',
    reason: '',
    priority: 'normal',
    notes: '',
  });
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingTutores, setLoadingTutores] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadTutores() {
      setLoadingTutores(true);
      try {
        const res = await tutoresApi.list({ per_page: 200 }, token);
        if (active) setTutores(res.data ?? []);
      } finally {
        if (active) setLoadingTutores(false);
      }
    }

    loadTutores();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!values.tutor_id) {
      setPatients([]);
      setValues((prev) => ({ ...prev, patient_id: '' }));
      return;
    }

    let active = true;

    async function loadPatients() {
      setLoadingPatients(true);
      try {
        const res = await fetchPatients(token, {
          search: '',
          species: '',
          active: 'all',
          tutor_id: Number(values.tutor_id),
          per_page: 200,
          page: 1,
        });
        if (active) setPatients(res.data ?? []);
      } finally {
        if (active) setLoadingPatients(false);
      }
    }

    loadPatients();
    return () => {
      active = false;
    };
  }, [token, values.tutor_id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  const inputClass =
    'w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/60';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Tutor
          </label>
          <select
            required
            value={values.tutor_id}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                tutor_id: e.target.value,
                patient_id: '',
              }))
            }
            className={inputClass}
            disabled={loadingTutores}
          >
            <option value="">Seleccionar tutor…</option>
            {tutores.map((t) => (
              <option key={t.id} value={t.id}>
                {[t.nombres, t.apellidos].filter(Boolean).join(' ') ||
                  `Tutor #${t.id}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Paciente
          </label>
          <select
            required
            value={values.patient_id}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, patient_id: e.target.value }))
            }
            className={inputClass}
            disabled={!values.tutor_id || loadingPatients}
          >
            <option value="">
              {!values.tutor_id
                ? 'Primero selecciona un tutor'
                : 'Seleccionar paciente…'}
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                Ficha #{p.id} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Motivo de visita
        </label>
        <input
          required
          type="text"
          value={values.reason}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, reason: e.target.value }))
          }
          placeholder="Ej. Control, vacuna, urgencia…"
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Prioridad
          </label>
          <select
            value={values.priority}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                priority: e.target.value as WaitingRoomPriority,
              }))
            }
            className={inputClass}
          >
            <option value="normal">Normal</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Observación (opcional)
          </label>
          <input
            type="text"
            value={values.notes}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Notas breves"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary disabled:opacity-60"
        >
          {submitting ? 'Ingresando…' : 'Agregar a sala de espera'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
