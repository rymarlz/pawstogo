// src/payments/components/PaymentForm.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';

import type {
  PaymentFormValues,
  PaymentStatus,
  PaymentMethod,
} from '../types';

import { fetchPatients } from '../../clinic/api';
import { tutoresApi } from '../../tutores/api';

import type { Patient } from '../../clinic/types';
import type { Tutor } from '../../tutores/types';

type Props = {
  mode: 'create' | 'edit';
  initialValues: PaymentFormValues;
  onSubmit: (values: PaymentFormValues) => Promise<void> | void;
  submitting?: boolean;
  onCancel?: () => void; // 👈 NUEVO
};

export function PaymentForm({
  mode,
  initialValues,
  onSubmit,
  submitting = false,
  onCancel,
}: Props) {
  const { token } = useAuth();

  const [values, setValues] = useState<PaymentFormValues>(initialValues);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const isEdit = mode === 'edit';

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  // Cargar pacientes activos y tutores
  useEffect(() => {
    async function loadLookups() {
      if (!token) return;

      try {
        setLoadingLookups(true);
        setLookupError(null);

        const [patientsRes, tutorsRes] = await Promise.all([
          fetchPatients(token, {
            search: '',
            species: '',
            active: 'true', // solo activos
            page: 1,
            per_page: 100,
          }),
          tutoresApi.list(
            {
              search: '',
              page: 1,
              per_page: 100,
            },
            token,
          ),
        ]);

        const pData = Array.isArray(patientsRes.data)
          ? (patientsRes.data as Patient[])
          : [];

        const tData = Array.isArray(tutorsRes.data)
          ? (tutorsRes.data as Tutor[])
          : [];

        setPatients(pData);
        setTutors(tData);
      } catch (err: any) {
        console.error('Error cargando listas para pagos:', err);
        setLookupError(
          err?.response?.data?.message ||
            err?.message ||
            'No se pudieron cargar pacientes y tutores.',
        );
      } finally {
        setLoadingLookups(false);
      }
    }

    void loadLookups();
  }, [token]);

  function handleChange<K extends keyof PaymentFormValues>(
    key: K,
    value: PaymentFormValues[K],
  ) {
    setValues(prev => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit(values);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      {lookupError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {lookupError}
        </div>
      )}

      {loadingLookups && (
        <p className="text-xs text-slate-500">
          Cargando pacientes y tutores para el formulario…
        </p>
      )}

      {/* Paciente y Tutor */}
      <div className="grid gap-2 sm:grid-cols-2">
        {/* Paciente */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-700">
            Paciente
          </label>
          <select
            className="mt-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={values.patient_id}
            onChange={e => handleChange('patient_id', e.target.value)}
            required
          >
            <option value="">Selecciona un paciente…</option>
            {patients.map(p => {
              const anyPatient = p as any;
              const label =
                anyPatient.name ||
                anyPatient.nombre ||
                `Paciente #${anyPatient.id}`;
              return (
                <option key={p.id} value={String(p.id)}>
                  {label}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            Se registrará el pago asociado a este paciente.
          </p>
        </div>

        {/* Tutor */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-700">
            Tutor (opcional)
          </label>
          <select
            className="mt-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            value={values.tutor_id}
            onChange={e => handleChange('tutor_id', e.target.value)}
          >
            <option value="">Selecciona un tutor…</option>
            {tutors.map(t => {
              const anyTutor = t as any;
              const label =
                anyTutor.name ||
                anyTutor.full_name ||
                anyTutor.alias ||
                anyTutor.email ||
                `Tutor #${anyTutor.id}`;

              return (
                <option key={t.id} value={String(t.id)}>
                  {label}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            Opcional, pero ayuda a consolidar la cuenta del cliente.
          </p>
        </div>
      </div>

      {/* Concepto y monto */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-700">
            Concepto
          </label>
          <input
            type="text"
            className="mt-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="Consulta general, vacunación anual, cirugía, etc."
            value={values.concept}
            onChange={e => handleChange('concept', e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-700">
            Monto
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="mt-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Ej: 25000"
            value={values.amount}
            onChange={e => handleChange('amount', e.target.value)}
            required
          />
        </div>
      </div>

      {/* Estado y método */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-700">
            Estado del pago
          </label>
          <select
            className="mt-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            value={values.status}
            onChange={e =>
              handleChange('status', e.target.value as PaymentStatus)
            }
            required
          >
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-700">
            Método de pago
          </label>
          <select
            className="mt-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
            value={values.method}
            onChange={e =>
              handleChange('method', e.target.value as '' | PaymentMethod)
            }
          >
            <option value="">Sin informar</option>
            <option value="efectivo">Efectivo</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>
      </div>

      {/* Notas */}
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-700">
          Notas / detalle interno
        </label>
        <textarea
          className="mt-1 min-h-[80px] rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
          placeholder="Detalles sobre descuentos, acuerdos de pago, promos, etc."
          value={values.notes}
          onChange={e => handleChange('notes', e.target.value)}
        />
      </div>

      {/* Botones */}
      <div className="flex flex-wrap justify-end gap-2 pt-2 text-xs">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? isEdit
              ? 'Guardando cambios…'
              : 'Registrando pago…'
            : isEdit
            ? 'Guardar cambios'
            : 'Registrar pago'}
        </button>
      </div>
    </form>
  );
}
