// src/hospitalizations/components/HospitalizationForm.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../auth/AuthContext';

import type {
  HospitalizationStatus,
  HospitalizationFormValues,
} from '../types';

import { fetchPatients } from '../../clinic/api';
import { fetchTutores } from '../../tutores/api';

import type { Patient, PatientFilters } from '../../clinic/types';
import type { Tutor } from '../../tutores/types';

type Props = {
  mode: 'create' | 'edit';
  initialValues: HospitalizationFormValues;
  onSubmit: (values: HospitalizationFormValues) => Promise<void> | void;
  submitting?: boolean;
};

export function HospitalizationForm({
  mode,
  initialValues,
  onSubmit,
  submitting = false,
}: Props) {
  const { token } = useAuth();

  const [values, setValues] = useState<HospitalizationFormValues>(
    initialValues,
  );

  const [patients, setPatients] = useState<Patient[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const isEdit = mode === 'edit';

  // sincronizar cuando cambian los initialValues (modo edit)
  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  // Cargar pacientes y tutores para los selects
  useEffect(() => {
    async function loadLookups() {
      if (!token) return;

      try {
        setLoadingLookups(true);
        setLookupError(null);

        // 👇 Ajustamos a tu tipo PatientFilters (search, species, active, page, per_page)
        const patientFilters: PatientFilters = {
          search: '',
          species: '',
          active: "true",
          page: 1,
          per_page: 100,
        };

        const [patientsRes, tutorsRes] = await Promise.all([
          fetchPatients(token, patientFilters),
          fetchTutores(token, { page: 1, per_page: 100 }),
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
        console.error('Error cargando listas para internaciones:', err);
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

  function handleChange<K extends keyof HospitalizationFormValues>(
    key: K,
    value: HospitalizationFormValues[K],
  ) {
    setValues((prev: HospitalizationFormValues) => ({
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
      {/* Errores al cargar listas */}
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
            {patients.map(p => (
              <option key={p.id} value={String(p.id)}>
                {p.name || `Paciente #${p.id}`}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            Aquí eliges por nombre, internamente se envía el ID al servidor.
          </p>
        </div>

        {/* Tutor */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-700">
            Tutor
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
            Opcional, pero recomendado para vincular la internación al tutor.
          </p>
        </div>
      </div>

      {/* Fechas */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-700">
            Fecha de ingreso
          </label>
          <input
            type="date"
            className="mt-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            value={values.admission_date}
            onChange={e => handleChange('admission_date', e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-700">
            Fecha de alta (opcional)
          </label>
          <input
            type="date"
            className="mt-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
            value={values.discharge_date}
            onChange={e => handleChange('discharge_date', e.target.value)}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            Puedes completarla al dar el alta al paciente.
          </p>
        </div>
      </div>

      {/* Estado + cama */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-700">
            Estado de la internación
          </label>
          <select
            className="mt-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            value={values.status}
            onChange={e =>
              handleChange('status', e.target.value as HospitalizationStatus)
            }
            required
          >
            <option value="active">Activa</option>
            <option value="discharged">Alta</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-700">
            Cama / box
          </label>
          <input
            type="text"
            className="mt-1 rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="Ej: Cama 3, Box A, Jaula 2…"
            value={values.bed_number}
            onChange={e => handleChange('bed_number', e.target.value)}
          />
        </div>
      </div>

      {/* Notas */}
      <div className="flex flex-col">
        <label className="text-xs font-medium text-slate-700">
          Notas clínicas / indicaciones
        </label>
        <textarea
          className="mt-1 min-h-[80px] rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400"
          placeholder="Motivo de la internación, indicaciones clínicas, monitoreo, etc."
          value={values.notes}
          onChange={e => handleChange('notes', e.target.value)}
        />
      </div>

      {/* Botón submit */}
      <div className="flex flex-wrap justify-end gap-2 pt-2 text-xs">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? isEdit
              ? 'Guardando cambios…'
              : 'Creando internación…'
            : isEdit
            ? 'Guardar cambios'
            : 'Crear internación'}
        </button>
      </div>
    </form>
  );
}
