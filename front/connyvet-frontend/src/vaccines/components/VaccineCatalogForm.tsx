// src/vaccines/components/VaccineCatalogForm.tsx
import type { FormEvent, Dispatch, SetStateAction } from 'react';

export type VaccineFormValues = {
  name: string;
  species: string;
  short_description: string;
  default_interval_days: string;
  default_dose_ml: string;
  notes: string;
  active: boolean;
  is_core: boolean; // 👈 nuevo
};

type Props = {
  mode: 'create' | 'edit';
  values: VaccineFormValues;
  onChange: Dispatch<SetStateAction<VaccineFormValues>>;
  onSubmit: (e: FormEvent) => void;
  submitting: boolean;
  fieldErrors: Record<string, string>;
  errorBanner: string | null;
};

function getFieldError(
  field: string,
  fieldErrors: Record<string, string>,
): string | undefined {
  return fieldErrors[field];
}

export const createInitialVaccineFormValues: VaccineFormValues = {
  name: '',
  species: '',
  short_description: '',
  default_interval_days: '',
  default_dose_ml: '',
  notes: '',
  active: true,
  is_core: false, // 👈 por defecto no núcleo
};

export function VaccineCatalogForm({
  mode,
  values,
  onChange,
  onSubmit,
  submitting,
  fieldErrors,
  errorBanner,
}: Props) {
  const nameError = getFieldError('name', fieldErrors);
  const speciesError = getFieldError('species', fieldErrors);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorBanner && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorBanner}
        </div>
      )}

      {/* Nombre y especie */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Nombre comercial / vacuna <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className={`input ${
              nameError ? 'border-red-300 focus:ring-red-200' : ''
            }`}
            value={values.name}
            onChange={e =>
              onChange(prev => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ej: Octuple canina, Triple felina…"
            aria-invalid={!!nameError}
            aria-describedby={nameError ? 'vaccine-name-error' : undefined}
          />
          {nameError && (
            <p
              id="vaccine-name-error"
              className="mt-1 text-[11px] text-red-600"
            >
              {nameError}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Especie principal <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            className={`input ${
              speciesError ? 'border-red-300 focus:ring-red-200' : ''
            }`}
            value={values.species}
            onChange={e =>
              onChange(prev => ({ ...prev, species: e.target.value }))
            }
            placeholder="Perro, Gato, Canino / Felino, Multiespecie…"
            aria-invalid={!!speciesError}
            aria-describedby={
              speciesError ? 'vaccine-species-error' : undefined
            }
          />
          {speciesError && (
            <p
              id="vaccine-species-error"
              className="mt-1 text-[11px] text-red-600"
            >
              {speciesError}
            </p>
          )}
        </div>
      </div>

      {/* Descripción corta */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-500">
          Descripción corta
        </label>
        <input
          type="text"
          className="input"
          value={values.short_description}
          onChange={e =>
            onChange(prev => ({
              ...prev,
              short_description: e.target.value,
            }))
          }
          placeholder="Ej: Parvo, moquillo, hepatitis…"
        />
      </div>

      {/* Intervalo y dosis por defecto */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Intervalo sugerido entre dosis (días)
          </label>
          <input
            type="number"
            min={0}
            className="input"
            value={values.default_interval_days}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                default_interval_days: e.target.value,
              }))
            }
            placeholder="Ej: 365"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Deja vacío si no aplica o el esquema es variable.
          </p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Dosis sugerida (ml)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            className="input"
            value={values.default_dose_ml}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                default_dose_ml: e.target.value,
              }))
            }
            placeholder="Ej: 1.0"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Puedes ajustar dosis por paciente al momento de agendar / aplicar.
          </p>
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-500">
          Notas / indicaciones internas
        </label>
        <textarea
          className="input min-h-[80px]"
          value={values.notes}
          onChange={e =>
            onChange(prev => ({ ...prev, notes: e.target.value }))
          }
          placeholder="Detalles sobre esquema recomendado, contraindicaciones, observaciones internas…"
        />
      </div>

      {/* Flags: núcleo + activa */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <input
            id="is_core"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            checked={values.is_core}
            onChange={e =>
              onChange(prev => ({ ...prev, is_core: e.target.checked }))
            }
          />
          <label htmlFor="is_core" className="text-xs text-slate-600">
            Vacuna núcleo (esquema básico recomendado para la especie).
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            checked={values.active}
            onChange={e =>
              onChange(prev => ({ ...prev, active: e.target.checked }))
            }
          />
          <label htmlFor="active" className="text-xs text-slate-600">
            Vacuna activa en el catálogo (disponible para agendar).
          </label>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="btn"
        >
          {submitting
            ? mode === 'create'
              ? 'Guardando…'
              : 'Actualizando…'
            : mode === 'create'
            ? 'Crear vacuna'
            : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
