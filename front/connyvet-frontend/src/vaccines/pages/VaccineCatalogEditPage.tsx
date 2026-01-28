// src/vaccines/pages/VaccineCatalogEditPage.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { apiFetch } from '../api';
import type { Vaccine, VaccinePayload } from '../types';
import {
  VaccineCatalogForm,
  createInitialVaccineFormValues,
  type VaccineFormValues,
} from '../components/VaccineCatalogForm';

type ApiValidationErrors = Record<string, string[]>;

export function VaccineCatalogEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const idParam = id ?? '';
  const numericId = Number(idParam);

  const [values, setValues] = useState<VaccineFormValues>(() => ({
    ...createInitialVaccineFormValues,
  }));

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) {
        setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
        setLoading(false);
        return;
      }

      if (!idParam) {
        setErrorBanner('Vacuna no encontrada.');
        setLoading(false);
        return;
      }

      const lower = idParam.toLowerCase();
      if (lower === 'nueva' || lower === 'nuevo') {
        navigate('/dashboard/catalogo-vacunas/nueva', { replace: true });
        return;
      }

      if (Number.isNaN(numericId)) {
        setErrorBanner('Vacuna no encontrada (ID inválido en la URL).');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorBanner(null);

        const res = await apiFetch<{ data: Vaccine }>(
          `/vaccines/${numericId}`,
          {
            method: 'GET',
            token,
          },
        );

        const v = res.data;
        const anyV = v as any;

        const base: VaccineFormValues = {
          ...createInitialVaccineFormValues,
        };

      const mapped: VaccineFormValues = {
  ...base,
  name: v.name ?? '',
  species: v.species ?? '',
  short_description: anyV.short_description ?? '',
  default_interval_days:
    anyV.default_interval_days != null
      ? String(anyV.default_interval_days)
      : '',
  default_dose_ml:
    anyV.default_dose_ml != null
      ? String(anyV.default_dose_ml)
      : '',
  notes: anyV.notes ?? '',
  active:
    typeof anyV.active === 'boolean' ? anyV.active : base.active,
  is_core:
    typeof anyV.is_core === 'boolean' ? anyV.is_core : base.is_core, // 👈 nuevo
};


        setValues(mapped);
      } catch (err: any) {
        console.error('Error cargando vacuna:', err);
        const message =
          err?.messageApi ||
          err?.response?.data?.message ||
          err?.message ||
          'No se pudo cargar la vacuna.';
        setErrorBanner(message);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, idParam, numericId, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    if (!idParam) {
      setErrorBanner('Vacuna no encontrada.');
      return;
    }

    const lower = idParam.toLowerCase();
    if (lower === 'nueva' || lower === 'nuevo' || Number.isNaN(numericId)) {
      setErrorBanner('Vacuna no encontrada (ID inválido en la URL).');
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setErrorBanner(null);

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
        'Revisa los campos marcados antes de guardar los cambios.',
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
  is_core: !!values.is_core, // 👈 se envía al actualizar
};
    try {
      await apiFetch(`/vaccines/${numericId}`, {
        method: 'PUT',
        token,
        data: payload,
      });

      navigate('/dashboard/catalogo-vacunas');
    } catch (err: any) {
      console.error('Error actualizando vacuna:', err);

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
        'No se pudo actualizar la vacuna.';

      setErrorBanner(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Editar vacuna">
        <div className="card mx-auto max-w-3xl text-sm text-slate-600">
          Cargando información de la vacuna…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Editar vacuna">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Editar vacuna del catálogo
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Ajusta el nombre, especie, descripciones y parámetros sugeridos de
            esta vacuna. Los cambios se reflejarán en la agenda y en las futuras
            aplicaciones.
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
