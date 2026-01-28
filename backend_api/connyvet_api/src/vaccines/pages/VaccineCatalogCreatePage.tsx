// src/vaccines/pages/VaccineCatalogCreatePage.tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';

import { apiFetch } from '../api';
import type { VaccinePayload } from '../types';

import {
  VaccineCatalogForm,
  createInitialVaccineFormValues,
  type VaccineFormValues,
} from '../components/VaccineCatalogForm';

type ApiValidationErrors = Record<string, string[]>;

export function VaccineCatalogCreatePage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [values, setValues] = useState<VaccineFormValues>(() => ({
    ...createInitialVaccineFormValues,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setErrorBanner(null);

    // ===== Validaciones básicas en front =====
    const newFieldErrors: Record<string, string> = {};

    if (!values.name.trim()) {
      newFieldErrors.name = 'El nombre de la vacuna es obligatorio.';
    }
    if (!values.species.trim()) {
      newFieldErrors.species = 'La especie principal es obligatoria.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setErrorBanner(
        'Revisa los campos marcados antes de guardar la vacuna.',
      );
      setSubmitting(false);
      return;
    }

    const payload: VaccinePayload & {
    default_interval_days?: number | null;
    notes?: string | null;
    active?: boolean;
    is_core?: boolean;
  } = {
    name: values.name.trim(),
    species: values.species.trim(),
    short_description: values.short_description.trim() || null,
    default_interval_days: values.default_interval_days
      ? Number(values.default_interval_days)
      : null,
    default_dose_ml: values.default_dose_ml
      ? Number(values.default_dose_ml)
      : null,
    notes: values.notes.trim() || null,
    active: !!values.active,
    is_core: !!values.is_core, // 👈 ahora se envía a la API
  };

    try {
      // 👇 importante: usamos `data`, no `body`
      await apiFetch('/vaccines', {
        method: 'POST',
        token,
        data: payload,
      });

      navigate('/dashboard/catalogo-vacunas');
    } catch (err: any) {
      console.error('Error creando vacuna:', err);

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
        'No se pudo crear la vacuna en el catálogo.';

      setErrorBanner(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Nueva vacuna">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Registrar vacuna en catálogo
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Define una vacuna para usarla en la agenda y en las fichas de
            pacientes. Luego podrás asociarla a aplicaciones de vacuna.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/catalogo-vacunas')}
          className="rounded-xl border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
        >
          Volver al catálogo
        </button>
      </div>

      <VaccineCatalogForm
        mode="create"
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
