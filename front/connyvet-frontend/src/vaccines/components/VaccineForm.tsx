// src/vaccines/components/VaccineForm.tsx
import type { FormEvent } from 'react';
import type { VaccinePayload } from '../types';

export type VaccineFormValues = {
  name: string;
  species: string;
  manufacturer: string;
  short_description: string;
  description: string;
  default_dose_ml: string;
  route: string;
  min_age_weeks: string;
  max_age_weeks: string;
  default_interval_days: string;
  is_core: boolean;
  active: boolean;
};

export type ApiValidationErrors = Record<string, string[]>;

interface VaccineFormProps {
  mode: 'create' | 'edit';
  values: VaccineFormValues;
  onChange: (values: VaccineFormValues) => void;
  onSubmit: (e: FormEvent) => void;
  submitting: boolean;
  fieldErrors: Record<string, string>;
  errorBanner: string | null;
}

export function createInitialVaccineFormValues(): VaccineFormValues {
  return {
    name: '',
    species: '',
    manufacturer: '',
    short_description: '',
    description: '',
    default_dose_ml: '',
    route: '',
    min_age_weeks: '',
    max_age_weeks: '',
    default_interval_days: '',
    is_core: false,
    active: true,
  };
}

export function mapFormToPayload(
  form: VaccineFormValues,
): VaccinePayload {
  return {
    name: form.name.trim(),
    species: form.species.trim() || null,
    manufacturer: form.manufacturer.trim() || null,
    short_description: form.short_description.trim() || null,
    description: form.description.trim() || null,
    default_dose_ml: form.default_dose_ml
      ? Number(form.default_dose_ml)
      : null,
    route: form.route.trim() || null,
    min_age_weeks: form.min_age_weeks
      ? Number(form.min_age_weeks)
      : null,
    max_age_weeks: form.max_age_weeks
      ? Number(form.max_age_weeks)
      : null,
    default_interval_days: form.default_interval_days
      ? Number(form.default_interval_days)
      : null,
    is_core: !!form.is_core,
    active: !!form.active,
  };
}

export function mapPayloadToForm(
  payload: Partial<VaccinePayload> & { name?: string },
): VaccineFormValues {
  return {
    name: payload.name ?? '',
    species: payload.species ?? '',
    manufacturer: payload.manufacturer ?? '',
    short_description: payload.short_description ?? '',
    description: payload.description ?? '',
    default_dose_ml:
      payload.default_dose_ml != null
        ? String(payload.default_dose_ml)
        : '',
    route: payload.route ?? '',
    min_age_weeks:
      payload.min_age_weeks != null
        ? String(payload.min_age_weeks)
        : '',
    max_age_weeks:
      payload.max_age_weeks != null
        ? String(payload.max_age_weeks)
        : '',
    default_interval_days:
      payload.default_interval_days != null
        ? String(payload.default_interval_days)
        : '',
    is_core: !!payload.is_core,
    active: payload.active !== false,
  };
}

export function VaccineForm({
  mode,
  values,
  onChange,
  onSubmit,
  submitting,
  fieldErrors,
  errorBanner,
}: VaccineFormProps) {
  function update<K extends keyof VaccineFormValues>(
    field: K,
    value: VaccineFormValues[K],
  ) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-sm">
      {errorBanner && (
        <div
          className="rounded-xl border px-3 py-2 text-xs"
          style={{
            borderColor: '#f97373',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
          }}
        >
          {errorBanner}
        </div>
      )}

      {/* Primera fila: nombre + especie + fabricante */}
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Nombre de la vacuna *
          </label>
          <input
            type="text"
            className="input"
            value={values.name}
            onChange={e => update('name', e.target.value)}
            required
          />
          {fieldErrors.name && (
            <p className="mt-1 text-[11px] text-red-600">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Especie objetivo
          </label>
          <select
            className="input"
            value={values.species}
            onChange={e => update('species', e.target.value)}
          >
            <option value="">Todas / genérica</option>
            <option value="perro">Perro</option>
            <option value="gato">Gato</option>
            <option value="ave">Ave</option>
            <option value="roedor">Roedor</option>
            <option value="reptil">Reptil</option>
            <option value="otro">Otro</option>
          </select>
          {fieldErrors.species && (
            <p className="mt-1 text-[11px] text-red-600">
              {fieldErrors.species}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Fabricante / laboratorio
          </label>
          <input
            type="text"
            className="input"
            value={values.manufacturer}
            onChange={e => update('manufacturer', e.target.value)}
          />
          {fieldErrors.manufacturer && (
            <p className="mt-1 text-[11px] text-red-600">
              {fieldErrors.manufacturer}
            </p>
          )}
        </div>
      </div>

      {/* Descripciones */}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Descripción corta
          </label>
          <input
            type="text"
            className="input"
            value={values.short_description}
            onChange={e => update('short_description', e.target.value)}
          />
          {fieldErrors.short_description && (
            <p className="mt-1 text-[11px] text-red-600">
              {fieldErrors.short_description}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Vía de administración
          </label>
          <input
            type="text"
            className="input"
            placeholder="SC, IM, etc."
            value={values.route}
            onChange={e => update('route', e.target.value)}
          />
          {fieldErrors.route && (
            <p className="mt-1 text-[11px] text-red-600">
              {fieldErrors.route}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Descripción detallada / notas técnicas
        </label>
        <textarea
          className="input min-h-[80px]"
          value={values.description}
          onChange={e => update('description', e.target.value)}
        />
        {fieldErrors.description && (
          <p className="mt-1 text-[11px] text-red-600">
            {fieldErrors.description}
          </p>
        )}
      </div>

      {/* Dosis y edades */}
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Dosis sugerida (ml)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={values.default_dose_ml}
            onChange={e => update('default_dose_ml', e.target.value)}
          />
          {fieldErrors.default_dose_ml && (
            <p className="mt-1 text-[11px] text-red-600">
              {fieldErrors.default_dose_ml}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Edad mínima (semanas)
          </label>
          <input
            type="number"
            min="0"
            className="input"
            value={values.min_age_weeks}
            onChange={e => update('min_age_weeks', e.target.value)}
          />
          {fieldErrors.min_age_weeks && (
            <p className="mt-1 text-[11px] text-red-600">
              {fieldErrors.min_age_weeks}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Edad máxima (semanas)
          </label>
          <input
            type="number"
            min="0"
            className="input"
            value={values.max_age_weeks}
            onChange={e => update('max_age_weeks', e.target.value)}
          />
          {fieldErrors.max_age_weeks && (
            <p className="mt-1 text-[11px] text-red-600">
              {fieldErrors.max_age_weeks}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Intervalo refuerzo (días)
          </label>
          <input
            type="number"
            min="0"
            className="input"
            value={values.default_interval_days}
            onChange={e =>
              update('default_interval_days', e.target.value)
            }
          />
          {fieldErrors.default_interval_days && (
            <p className="mt-1 text-[11px] text-red-600">
              {fieldErrors.default_interval_days}
            </p>
          )}
        </div>
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-4 text-xs">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.is_core}
            onChange={e => update('is_core', e.target.checked)}
          />
          <span>Vacuna "core" para la especie</span>
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.active}
            onChange={e => update('active', e.target.checked)}
          />
          <span>Vacuna activa en la clínica</span>
        </label>
      </div>

      {/* Botón */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn"
        >
          {submitting
            ? mode === 'create'
              ? 'Creando…'
              : 'Guardando…'
            : mode === 'create'
            ? 'Crear vacuna'
            : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
