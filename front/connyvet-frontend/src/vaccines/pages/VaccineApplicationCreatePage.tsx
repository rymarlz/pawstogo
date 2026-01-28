// src/vaccines/pages/VaccineApplicationCreatePage.tsx
import { useEffect, useState, type FormEvent, type Dispatch, type SetStateAction } from 'react';
import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';

import { apiFetch } from '../api';
import type {
  VaccineApplicationFormValues,
  VaccineApplicationStatus,
  Vaccine,
  PaginatedResponse,
} from '../types';
import {
  VaccineApplicationForm,
  createInitialVaccineApplicationFormValues,
} from '../components/VaccineApplicationForm';

type ApiValidationErrors = Record<string, string[]>;

// Mapa id -> vacuna para poder usar dosis / intervalos del catálogo
type VaccinesById = Record<number, Vaccine>;

export function VaccineApplicationCreatePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [searchParams] = useSearchParams();

  // Prefill desde query (ej: ?patient_id=2&vaccine_id=5)
  const patientFromQuery = searchParams.get('patient_id');
  const vaccineFromQuery = searchParams.get('vaccine_id');

  const [values, setValues] = useState<VaccineApplicationFormValues>(() => {
    const base = { ...createInitialVaccineApplicationFormValues };

    if (patientFromQuery) {
      base.patient_id = patientFromQuery;
      base.patient_label = `Paciente #${patientFromQuery}`;
    }

    if (vaccineFromQuery) {
      base.vaccine_id = vaccineFromQuery;
      base.vaccine_label = `Vacuna #${vaccineFromQuery}`;
    }

    return base;
  });

  const [vaccinesById, setVaccinesById] = useState<VaccinesById>({});
  const [loadingVaccines, setLoadingVaccines] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // ==========================
  // Cargar catálogo de vacunas activas
  // ==========================
  useEffect(() => {
    async function loadVaccines() {
      if (!token) return;

      try {
        setLoadingVaccines(true);

        const res = await apiFetch<PaginatedResponse<Vaccine>>(
          '/vaccines',
          {
            method: 'GET',
            token,
            params: {
              active: '1',
              per_page: 200,
            },
          },
        );

        const data = Array.isArray(res.data) ? res.data : [];
        const map: VaccinesById = {};
        for (const v of data) {
          map[v.id] = v;
        }
        setVaccinesById(map);
      } catch (err) {
        console.error('No se pudo cargar el catálogo de vacunas para sugerencias:', err);
      } finally {
        setLoadingVaccines(false);
      }
    }

    void loadVaccines();
  }, [token]);

  // ==========================
  // onChange inteligente: usa catálogo para autocompletar
  // ==========================
  const handleFormChange: Dispatch<SetStateAction<VaccineApplicationFormValues>> =
    updater => {
      setValues(prev => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: VaccineApplicationFormValues) => VaccineApplicationFormValues)(prev)
            : updater;

        const result: VaccineApplicationFormValues = { ...next };

        const vaccineIdNum = result.vaccine_id
          ? Number(result.vaccine_id)
          : NaN;

        const vaccine =
          !Number.isNaN(vaccineIdNum) && vaccinesById[vaccineIdNum]
            ? vaccinesById[vaccineIdNum]
            : undefined;

        if (vaccine) {
          // Autocompletar dosis sugerida si está vacía
          if (!result.dose_ml && vaccine.default_dose_ml != null) {
            result.dose_ml = String(vaccine.default_dose_ml);
          }

          // Autocompletar próxima dosis si:
          // - hay fecha planificada
          // - no hay next_due_date aún
          // - el catálogo tiene default_interval_days
          if (
            result.planned_date &&
            !result.next_due_date &&
            vaccine.default_interval_days != null &&
            vaccine.default_interval_days > 0
          ) {
            const base = new Date(result.planned_date + 'T00:00:00');
            if (!Number.isNaN(base.getTime())) {
              base.setDate(
                base.getDate() + vaccine.default_interval_days,
              );
              const year = base.getFullYear();
              const month = String(base.getMonth() + 1).padStart(2, '0');
              const day = String(base.getDate()).padStart(2, '0');
              result.next_due_date = `${year}-${month}-${day}`;
            }
          }
        }

        return result;
      });
    };

  // ==========================
  // SUBMIT
  // ==========================
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setErrorBanner(null);

    // Validaciones mínimas en el front
    const newFieldErrors: Record<string, string> = {};

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
        'Revisa los campos marcados antes de guardar la vacunación.',
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
      await apiFetch('/vaccine-applications', {
        method: 'POST',
        token,
        data: payload,
      });

      navigate('/dashboard/vacunas');
    } catch (err: any) {
      console.error('Error creando aplicación de vacuna:', err);

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
        'No se pudo crear la vacunación.';

      setErrorBanner(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Registrar vacunación">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Registrar nueva aplicación de vacuna
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Crea un registro de vacunación asociado a un paciente y una
            vacuna del catálogo. Puedes indicar dosis, peso, lotes, sitio de
            aplicación y observaciones clínicas.
          </p>
          {loadingVaccines && (
            <p className="mt-1 text-[11px] text-slate-400">
              Cargando sugerencias desde el catálogo de vacunas…
            </p>
          )}
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
        mode="create"
        values={values}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        submitting={submitting}
        fieldErrors={fieldErrors}
        errorBanner={errorBanner}
      />
    </DashboardLayout>
  );
}
