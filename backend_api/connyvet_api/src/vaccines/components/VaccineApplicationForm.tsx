import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { apiFetch } from '../api';
import type {
  VaccineApplicationFormValues,
  PaginatedResponse,
  Vaccine,
} from '../types';
import type { Patient } from '../../clinic/types';
import { useAuth } from '../../auth/AuthContext';

export interface ApiValidationErrors {
  [key: string]: string[];
}

interface Props {
  mode: 'create' | 'edit';
  values: VaccineApplicationFormValues;
  onChange: Dispatch<SetStateAction<VaccineApplicationFormValues>>;
  onSubmit: (e: FormEvent) => void;
  submitting: boolean;
  fieldErrors: Record<string, string>;
  errorBanner: string | null;
}

// helper
function getFieldError(
  field: string,
  fieldErrors: Record<string, string>,
): string | undefined {
  return fieldErrors[field];
}

// =====================================================
// 🎨 Brand color (tu lila)
// =====================================================
const BRAND = '#b695c0';
const BRAND_DARK = '#a47fb0'; // hover un poco más oscuro
const BRAND_SOFT = '#f3edf6'; // fondo suave para hover items

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
      {children}
    </span>
  );
}

/**
 * Trigger lila: NO usa "input" para evitar override azul.
 */
const triggerBrand =
  'flex w-full items-center justify-between rounded-xl border ' +
  'px-4 py-2 text-left shadow-sm focus:outline-none focus:ring-2';

const triggerHint = 'ml-2 text-[11px] text-white/80';

const modalPrimaryBtnBase =
  'rounded-xl px-3 py-2 text-xs font-semibold shadow-sm ' +
  'disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2';

const modalSecondaryBtn =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50';

const inputBrand =
  'input !border-[#b695c0]/40 focus:!border-[#b695c0]/70 focus:!ring-[#b695c0]/30 !text-slate-900';

const selectBrand =
  'input !border-[#b695c0]/40 focus:!border-[#b695c0]/70 focus:!ring-[#b695c0]/30 !text-slate-900';

const checkboxBrand =
  'h-4 w-4 rounded border-slate-300 !text-[#b695c0] focus:!ring-[#b695c0]/30';

// =========================
// Búsqueda de pacientes
// =========================

async function searchPatientsApi(token: string, term: string): Promise<Patient[]> {
  const params = new URLSearchParams();
  if (term.trim()) params.set('search', term.trim());
  params.set('per_page', '10');

  const res = await apiFetch<{ data: Patient[] }>(`/patients?${params.toString()}`, {
    method: 'GET',
    token,
  });

  return Array.isArray(res.data) ? res.data : [];
}

interface PatientSearchProps {
  token?: string;
  value: VaccineApplicationFormValues;
  onChange: Dispatch<SetStateAction<VaccineApplicationFormValues>>;
  fieldErrors: Record<string, string>;
}

function PatientSelector({ token, value, onChange, fieldErrors }: PatientSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorSearch, setErrorSearch] = useState<string | null>(null);

  const fieldError = getFieldError('patient_id', fieldErrors);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!token) return;

    const term = search.trim();
    const id = window.setTimeout(async () => {
      setLoading(true);
      setErrorSearch(null);
      try {
        const data = await searchPatientsApi(token, term);
        setResults(data);
      } catch (err: any) {
        setErrorSearch(err?.message || 'No se pudieron cargar los pacientes.');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(id);
  }, [open, search, token]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
    return;
  }, [open]);

  function handleSelect(p: Patient) {
    const anyP: any = p;
    const labelParts: string[] = [];

    if (p.name) labelParts.push(p.name);
    const tutorName =
      anyP.tutor_nombre ||
      anyP.tutor_name ||
      anyP.tutor?.nombre ||
      anyP.tutor?.name ||
      '';

    if (tutorName) labelParts.push(tutorName);

    const label =
      labelParts.length > 0 ? labelParts.join(' · ') : `Paciente #${p.id}`;

    onChange(prev => ({
      ...prev,
      patient_id: String(p.id),
      patient_label: label,
    }));
    setOpen(false);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Paciente
        </label>
        {value.patient_id ? <Pill>ID #{value.patient_id}</Pill> : null}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerBrand}
        style={{
          backgroundColor: BRAND,
          borderColor: BRAND,
          color: '#fff',
          boxShadow: '0 6px 18px rgba(182, 149, 192, 0.22)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND_DARK;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND;
        }}
      >
        <span className="truncate text-xs font-semibold !text-white">
          {value.patient_label || 'Selecciona un paciente'}
        </span>
        <span className={triggerHint}>Buscar…</span>
      </button>

      {fieldError ? (
        <p className="mt-1 text-[11px] text-red-600">{fieldError}</p>
      ) : (
        <p className="mt-1 text-[11px] text-slate-400">
          Debe estar creado previamente en el módulo de pacientes.
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Buscar paciente
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] text-slate-500 hover:text-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <input
                ref={inputRef}
                type="search"
                className={`${inputBrand} flex-1`}
                placeholder="Nombre de paciente, tutor, chip…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setSearch(s => s)}
                className={modalPrimaryBtnBase}
                style={{
                  backgroundColor: BRAND,
                  color: '#fff',
                  border: `1px solid ${BRAND}`,
                }}
                disabled={loading || !token}
              >
                {loading ? 'Buscando…' : 'Buscar'}
              </button>
            </div>

            {errorSearch && (
              <p className="mb-2 text-[11px] text-red-600">{errorSearch}</p>
            )}

            {!loading && results.length === 0 && !errorSearch && (
              <p className="text-[11px] text-slate-500">
                No hay resultados. Ajusta el término de búsqueda.
              </p>
            )}

            {results.length > 0 && (
              <ul className="max-h-60 space-y-2 overflow-y-auto">
                {results.map(p => {
                  const anyP: any = p;
                  const tutorName =
                    anyP.tutor_nombre ||
                    anyP.tutor_name ||
                    anyP.tutor?.nombre ||
                    anyP.tutor?.name ||
                    '';
                  const species =
                    p.species || anyP.especie || anyP.species_label || '';

                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(p)}
                        className="flex w-full flex-col gap-0.5 rounded-xl border border-slate-200 !bg-white px-3 py-2 text-left shadow-sm focus:outline-none focus:ring-2"
                        style={{
                          borderColor: 'rgba(148, 163, 184, 0.45)',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND_SOFT;
                          (e.currentTarget as HTMLButtonElement).style.borderColor = `${BRAND}66`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff';
                          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(148, 163, 184, 0.45)';
                        }}
                      >
                        <span className="text-xs font-semibold text-slate-900">
                          {p.name || `Paciente #${p.id}`}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          {species ? `${species} · ` : ''}
                          {tutorName || 'Sin tutor visible'}
                        </span>
                        {anyP.microchip && (
                          <span className="text-[11px] text-slate-400">
                            Chip: {anyP.microchip}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={modalSecondaryBtn}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// Búsqueda de vacunas (catálogo)
// =========================

async function searchVaccinesApi(token: string, term: string): Promise<Vaccine[]> {
  const params = new URLSearchParams();
  if (term.trim()) params.set('search', term.trim());
  params.set('per_page', '10');
  params.set('active', '1');

  const res = await apiFetch<PaginatedResponse<Vaccine>>(`/vaccines?${params.toString()}`, {
    method: 'GET',
    token,
  });

  return Array.isArray(res.data) ? res.data : [];
}

interface VaccineSearchProps {
  token?: string;
  value: VaccineApplicationFormValues;
  onChange: Dispatch<SetStateAction<VaccineApplicationFormValues>>;
  fieldErrors: Record<string, string>;
}

function VaccineSelector({ token, value, onChange, fieldErrors }: VaccineSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorSearch, setErrorSearch] = useState<string | null>(null);

  const fieldError = getFieldError('vaccine_id', fieldErrors);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!token) return;

    const term = search.trim();
    const id = window.setTimeout(async () => {
      setLoading(true);
      setErrorSearch(null);
      try {
        const data = await searchVaccinesApi(token, term);
        setResults(data);
      } catch (err: any) {
        setErrorSearch(err?.message || 'No se pudieron cargar las vacunas.');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(id);
  }, [open, search, token]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
    return;
  }, [open]);

  function handleSelect(v: Vaccine) {
    const labelParts: string[] = [];
    if (v.name) labelParts.push(v.name);
    if (v.species) labelParts.push(v.species);

    const label =
      labelParts.length > 0 ? labelParts.join(' · ') : `Vacuna #${v.id}`;

    onChange(prev => ({
      ...prev,
      vaccine_id: String(v.id),
      vaccine_label: label,
    }));
    setOpen(false);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Vacuna
        </label>
        {value.vaccine_id ? <Pill>ID #{value.vaccine_id}</Pill> : null}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerBrand}
        style={{
          backgroundColor: BRAND,
          borderColor: BRAND,
          color: '#fff',
          boxShadow: '0 6px 18px rgba(182, 149, 192, 0.22)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND_DARK;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND;
        }}
      >
        <span className="truncate text-xs font-semibold !text-white">
          {value.vaccine_label || 'Selecciona una vacuna'}
        </span>
        <span className={triggerHint}>Buscar…</span>
      </button>

      {fieldError ? (
        <p className="mt-1 text-[11px] text-red-600">{fieldError}</p>
      ) : (
        <p className="mt-1 text-[11px] text-slate-400">
          Vacunas definidas en el catálogo de vacunas.
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-3">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Buscar vacuna
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] text-slate-500 hover:text-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <input
                ref={inputRef}
                type="search"
                className={`${inputBrand} flex-1`}
                placeholder="Nombre de vacuna, especie…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setSearch(s => s)}
                className={modalPrimaryBtnBase}
                style={{
                  backgroundColor: BRAND,
                  color: '#fff',
                  border: `1px solid ${BRAND}`,
                }}
                disabled={loading || !token}
              >
                {loading ? 'Buscando…' : 'Buscar'}
              </button>
            </div>

            {errorSearch && (
              <p className="mb-2 text-[11px] text-red-600">{errorSearch}</p>
            )}

            {!loading && results.length === 0 && !errorSearch && (
              <p className="text-[11px] text-slate-500">
                No hay resultados. Ajusta el término de búsqueda.
              </p>
            )}

            {results.length > 0 && (
              <ul className="max-h-60 space-y-2 overflow-y-auto">
                {results.map(v => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(v)}
                      className="flex w-full flex-col gap-0.5 rounded-xl border border-slate-200 !bg-white px-3 py-2 text-left shadow-sm focus:outline-none focus:ring-2"
                      style={{
                        borderColor: 'rgba(148, 163, 184, 0.45)',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND_SOFT;
                        (e.currentTarget as HTMLButtonElement).style.borderColor = `${BRAND}66`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ffffff';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(148, 163, 184, 0.45)';
                      }}
                    >
                      <span className="text-xs font-semibold text-slate-900">
                        {v.name}
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {v.species || 'Especie no especificada'}
                      </span>
                      {v.short_description && (
                        <span className="text-[11px] text-slate-400">
                          {v.short_description}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={modalSecondaryBtn}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// Form principal
// =========================

export function VaccineApplicationForm(props: Props) {
  const { mode, values, onChange, onSubmit, submitting, fieldErrors, errorBanner } =
    props;

  const { token } = useAuth();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errorBanner && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {errorBanner}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <PatientSelector
          token={token ?? undefined}
          value={values}
          onChange={onChange}
          fieldErrors={fieldErrors}
        />
        <VaccineSelector
          token={token ?? undefined}
          value={values}
          onChange={onChange}
          fieldErrors={fieldErrors}
        />
      </div>

      {/* Fechas y estado */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Fecha planificada
          </label>
          <input
            type="date"
            className={inputBrand}
            value={values.planned_date}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                planned_date: e.target.value,
              }))
            }
          />
          {getFieldError('planned_date', fieldErrors) && (
            <p className="mt-1 text-[11px] text-red-600">
              {getFieldError('planned_date', fieldErrors)}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Aplicada en
          </label>
          <input
            type="datetime-local"
            className={inputBrand}
            value={values.applied_at}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                applied_at: e.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Próximo refuerzo
          </label>
          <input
            type="date"
            className={inputBrand}
            value={values.next_due_date}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                next_due_date: e.target.value,
              }))
            }
          />
        </div>
      </div>

      {/* Dosis / peso / sitio */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Dosis aplicada (ml)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            className={inputBrand}
            value={values.dose_ml}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                dose_ml: e.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Peso en la visita (kg)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            className={inputBrand}
            value={values.weight_kg}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                weight_kg: e.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Sitio de aplicación
          </label>
          <input
            type="text"
            className={inputBrand}
            placeholder="Ej: SC cuello, IM muslo…"
            value={values.application_site}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                application_site: e.target.value,
              }))
            }
          />
        </div>
      </div>

      {/* Lote / serie / estado */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Nº de lote
          </label>
          <input
            type="text"
            className={inputBrand}
            value={values.batch_number}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                batch_number: e.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Nº de serie
          </label>
          <input
            type="text"
            className={inputBrand}
            value={values.serial_number}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                serial_number: e.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Estado
          </label>
          <select
            className={selectBrand}
            value={values.status}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                status: e.target.value as VaccineApplicationFormValues['status'],
              }))
            }
          >
            <option value="pendiente">Pendiente</option>
            <option value="aplicada">Aplicada</option>
            <option value="omitida">Omitida</option>
            <option value="vencida">Vencida</option>
          </select>
        </div>
      </div>

      {/* Observaciones y reacciones */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Observaciones
          </label>
          <textarea
            className={`${inputBrand} min-h-[80px]`}
            value={values.observations}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                observations: e.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Reacciones adversas
          </label>
          <textarea
            className={`${inputBrand} min-h-[80px]`}
            value={values.adverse_reactions}
            onChange={e =>
              onChange(prev => ({
                ...prev,
                adverse_reactions: e.target.value,
              }))
            }
          />
        </div>
      </div>

      {/* Activa / inactiva */}
      <div className="flex items-center gap-2">
        <input
          id="active"
          type="checkbox"
          className={checkboxBrand}
          checked={values.active}
          onChange={e =>
            onChange(prev => ({
              ...prev,
              active: e.target.checked,
            }))
          }
        />
        <label htmlFor="active" className="text-xs text-slate-600">
          Mantener esta aplicación activa en la agenda y el historial.
        </label>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2"
          style={{
            backgroundColor: BRAND,
            boxShadow: '0 6px 18px rgba(182, 149, 192, 0.25)',
            border: `1px solid ${BRAND}`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND_DARK;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = BRAND;
          }}
        >
          {submitting
            ? mode === 'create'
              ? 'Guardando…'
              : 'Actualizando…'
            : mode === 'create'
              ? 'Registrar vacuna'
              : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

// valores iniciales
const todayISO = new Date().toISOString().slice(0, 10);

export const createInitialVaccineApplicationFormValues: VaccineApplicationFormValues =
  {
    patient_id: '',
    patient_label: '',
    vaccine_id: '',
    vaccine_label: '',
    planned_date: todayISO,
    applied_at: '',
    next_due_date: '',
    status: 'pendiente',
    dose_ml: '',
    weight_kg: '',
    batch_number: '',
    serial_number: '',
    application_site: '',
    observations: '',
    adverse_reactions: '',
    active: true,
  };
