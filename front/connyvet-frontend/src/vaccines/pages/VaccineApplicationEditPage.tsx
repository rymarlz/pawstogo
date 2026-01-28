// src/vaccines/pages/VaccineApplicationEditPage.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchVaccineApplication,
  updateVaccineApplication,
} from '../api';
import type {
  VaccineApplication,
  VaccineApplicationStatus,
  VaccineApplicationFormValues,
} from '../types';
import {
  VaccineApplicationForm,
  createInitialVaccineApplicationFormValues,
} from '../components/VaccineApplicationForm';

type ApiValidationErrors = Record<string, string[]>;

// ============================
// Helpers fechas
// ============================
function normalizeDate(value?: string | null): string {
  if (!value) return '';
  if (value.includes('T')) return value.split('T')[0];
  return value;
}

function normalizeDateTimeLocal(value?: string | null): string {
  if (!value) return '';

  try {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    }
  } catch {
    // ignore
  }

  // fallback: recortar string tipo ISO
  if (value.length >= 16) {
    return value.slice(0, 16);
  }

  return value;
}

export function VaccineApplicationEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const idParam = id ?? '';
  const numericId = Number(idParam);

  const [values, setValues] = useState<VaccineApplicationFormValues>(() => ({
    ...createInitialVaccineApplicationFormValues,
  }));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // ============================
  // Cargar aplicación de vacuna
  // ============================
  useEffect(() => {
    async function load() {
      // Validación ID
      if (!idParam || Number.isNaN(numericId)) {
        setErrorBanner('Registro de vacunación no encontrado.');
        setLoading(false);
        return;
      }

      if (!token) {
        setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorBanner(null);

        const res = await fetchVaccineApplication(token, numericId);
        const app: VaccineApplication =
          (res as any).data ?? (res as any);
        const anyApp = app as any;

        const mapped: VaccineApplicationFormValues = {
          ...createInitialVaccineApplicationFormValues,

          // Paciente
          patient_id: app.patient_id ? String(app.patient_id) : '',
          patient_label:
            anyApp.patient?.name
              ? anyApp.patient.species
                ? `${anyApp.patient.name} (${anyApp.patient.species})`
                : anyApp.patient.name
              : app.patient_id
              ? `Paciente #${app.patient_id}`
              : '',

          // Tutor (si existe en la respuesta y en el form)
          ...(anyApp.tutor_id && {
            tutor_id: String(anyApp.tutor_id),
          }),

          // Vacuna (catálogo)
          vaccine_id: app.vaccine_id ? String(app.vaccine_id) : '',
          vaccine_label:
            anyApp.vaccine?.name ??
            (app.vaccine_id ? `Vacuna #${app.vaccine_id}` : ''),

          // Fechas
          planned_date: normalizeDate(
            anyApp.planned_date ?? anyApp.due_date,
          ),
          applied_at: normalizeDateTimeLocal(anyApp.applied_at),
          next_due_date: normalizeDate(anyApp.next_due_date),

          // Estado
          status:
            (app.status as VaccineApplicationStatus) ?? 'pendiente',

          // Dosis / peso
          dose_ml:
            app.dose_ml !== null && app.dose_ml !== undefined
              ? String(app.dose_ml)
              : '',
          weight_kg:
            app.weight_kg !== null && app.weight_kg !== undefined
              ? String(app.weight_kg)
              : '',

          // Datos adicionales
          batch_number: app.batch_number ?? '',
          serial_number: app.serial_number ?? '',
          application_site: app.application_site ?? '',

          observations: anyApp.observations ?? anyApp.notes ?? '',
          adverse_reactions:
            anyApp.adverse_reactions ?? anyApp.reactions ?? '',

          active:
            typeof app.active === 'boolean' ? app.active : true,
        };

        setValues(mapped);
      } catch (err: any) {
        console.error('Error cargando aplicación de vacuna:', err);
        const message =
          err?.messageApi ||
          err?.response?.data?.message ||
          err?.message ||
          'No se pudo cargar la vacunación.';
        setErrorBanner(message);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, idParam, numericId, navigate]);

  // ============================
  // Submit
  // ============================
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    if (!idParam || Number.isNaN(numericId)) {
      setErrorBanner('Registro de vacunación no encontrado.');
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setErrorBanner(null);

    const newFieldErrors: Record<string, string> = {};

    // Validaciones mínimas
    if (!values.patient_id) {
      newFieldErrors.patient_id =
        'Debes seleccionar un paciente desde el buscador.';
    }

    if (!values.vaccine_id) {
      newFieldErrors.vaccine_id =
        'Debes seleccionar una vacuna desde el catálogo.';
    }

    if (!values.planned_date) {
      newFieldErrors.planned_date =
        'La fecha planificada es obligatoria.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setErrorBanner(
        'Revisa los campos marcados antes de guardar los cambios.',
      );
      setSubmitting(false);
      return;
    }

    // Payload para la API
    const payload: any = {
      patient_id: values.patient_id
        ? Number(values.patient_id)
        : undefined,
      vaccine_id: values.vaccine_id
        ? Number(values.vaccine_id)
        : undefined,

      planned_date: values.planned_date || null,
      applied_at: values.applied_at || null,
      next_due_date: values.next_due_date || null,

      status: values.status as VaccineApplicationStatus,

      dose_ml: values.dose_ml ? Number(values.dose_ml) : null,
      weight_kg: values.weight_kg ? Number(values.weight_kg) : null,
      batch_number: values.batch_number || null,
      serial_number: values.serial_number || null,
      application_site: values.application_site || null,

      observations: values.observations || null,
      adverse_reactions: values.adverse_reactions || null,

      active: !!values.active,
    };

    try {
      await updateVaccineApplication(token, numericId, payload);
      navigate('/dashboard/vacunas');
    } catch (err: any) {
      console.error('Error actualizando aplicación de vacuna:', err);

      const validation: ApiValidationErrors | null =
        (err?.validation as ApiValidationErrors) ||
        (err?.response?.data?.errors as ApiValidationErrors) ||
        null;

      if (validation && typeof validation === 'object') {
        const flat: Record<string, string> = {};
        Object.entries(validation).forEach(([key, msgs]) => {
          if (Array.isArray(msgs) && msgs.length > 0) {
            flat[key] = msgs[0];
          }
        });
        setFieldErrors(flat);
      }

      const message =
        err?.messageApi ||
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo actualizar la vacunación.';

      setErrorBanner(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ============================
  // Render
  // ============================
  if (loading) {
    return (
      <DashboardLayout title="Editar vacunación">
        <div className="card mx-auto max-w-3xl text-sm text-slate-600">
          Cargando información de la vacunación…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Editar vacunación">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Editar aplicación de vacuna
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Ajusta las fechas, el estado y los detalles clínicos de esta
            vacunación. Los cambios se reflejarán en la agenda y en la ficha
            del paciente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/vacunas')}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
        >
          Volver a la agenda
        </button>
      </div>

      <VaccineApplicationForm
        mode="edit"
        values={values}
        onChange={setValues}
        onSubmit={handleSubmit}
        submitting={submitting}
        fieldErrors={fieldErrors}
        errorBanner={errorBanner}
      />
    </DashboardLayout>
  );
}
