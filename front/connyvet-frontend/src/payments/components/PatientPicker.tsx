import { useEffect, useMemo, useState } from 'react';
import { fetchPatients, fetchPatient } from '../../clinic/api';

type PatientLite = any;

export type SelectedPatient = {
  patient_id: number | null;
  tutor_id: number | null;
  patient: PatientLite | null;
};

type Props = {
  token: string;
  value: SelectedPatient;
  onChange: (next: SelectedPatient) => void;
};

function getTutorIdFromPatient(p: any): number | null {
  // depende de tu backend, soportamos variantes sin romper
  return (p?.tutor_id ?? p?.tutor?.id ?? null) as number | null;
}

function getPatientName(p: any, fallbackId?: number | null): string {
  return p?.name || p?.nombre || p?.pet_name || (fallbackId ? `Paciente #${fallbackId}` : 'Sin paciente seleccionado');
}

function getPatientSpecies(p: any): string | null {
  return p?.species_display || p?.species || null;
}

// Tema visual por especie: da un ancla visual rápida a cada fila de la lista
// sin depender de fotos que el backend no siempre entrega.
function getSpeciesTheme(species: string | null) {
  const s = (species || '').toLowerCase();

  if (s.includes('perro') || s.includes('canino') || s.includes('dog')) {
    return { emoji: '🐶', bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' };
  }
  if (s.includes('gato') || s.includes('felino') || s.includes('cat')) {
    return { emoji: '🐱', bg: 'bg-violet-100', text: 'text-violet-700', ring: 'ring-violet-200' };
  }
  if (s.includes('ave') || s.includes('bird') || s.includes('loro')) {
    return { emoji: '🦜', bg: 'bg-sky-100', text: 'text-sky-700', ring: 'ring-sky-200' };
  }
  if (s.includes('conejo') || s.includes('rabbit')) {
    return { emoji: '🐰', bg: 'bg-rose-100', text: 'text-rose-700', ring: 'ring-rose-200' };
  }
  return { emoji: '🐾', bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200' };
}

// Resalta la porción del texto que coincide con el término buscado,
// para que el usuario vea de inmediato por qué apareció ese resultado.
function highlightMatch(text: string, term: string) {
  if (!term.trim()) return text;

  const idx = text.toLowerCase().indexOf(term.trim().toLowerCase());
  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + term.trim().length);
  const after = text.slice(idx + term.trim().length);

  return (
    <>
      {before}
      <mark className="rounded bg-emerald-100 px-0.5 text-emerald-800">{match}</mark>
      {after}
    </>
  );
}

export function PatientPicker({ token, value, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [items, setItems] = useState<PatientLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // preload paciente si viene por query
  useEffect(() => {
    const pid = value.patient_id;
    if (!pid || value.patient) return;

    let alive = true;

    (async () => {
      try {
        const p = (await fetchPatient(token, pid)) as unknown as PatientLite;
        if (!alive) return;

        onChange({
          patient_id: (p?.id ?? pid) as number,
          tutor_id: getTutorIdFromPatient(p) ?? value.tutor_id ?? null,
          patient: p,
        });
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, value.patient_id]);

  async function runSearch(term: string) {
    setLoading(true);
    setError(null);
    setAppliedSearch(term);

    try {
      const res = await fetchPatients(token, {
        search: term,
        page: 1,
        per_page: 15,
      } as any);

      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar la lista de pacientes.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void runSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedLabel = useMemo(() => {
    if (!value.patient_id) return 'Sin paciente seleccionado';
    return getPatientName(value.patient, value.patient_id);
  }, [value.patient_id, value.patient]);

  const selectedExtra = useMemo(() => {
    const p = value.patient;
    if (!p) return null;

    const species = getPatientSpecies(p);
    const breed = p?.breed || p?.raza || null;

    return [species, breed].filter(Boolean).join(' · ') || null;
  }, [value.patient]);

  function pick(p: any) {
    onChange({
      patient_id: p.id ?? null,
      tutor_id: getTutorIdFromPatient(p),
      patient: p,
    });
  }

  function clear() {
    onChange({
      patient_id: null,
      tutor_id: null,
      patient: null,
    });
  }

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 text-xs shadow-sm">
      {/* Paciente seleccionado */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Paciente seleccionado
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-bold text-slate-900">
                {selectedLabel}
              </p>

              {value.patient_id && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  Ficha #{value.patient_id}
                </span>
              )}
            </div>

            {selectedExtra && (
              <p className="mt-1 text-xs text-slate-500">
                {selectedExtra}
              </p>
            )}

            {value.tutor_id ? (
              <p className="mt-1.5 text-xs text-slate-500">
                Tutor asociado:{' '}
                <span className="font-semibold text-slate-700">
                  #{value.tutor_id}
                </span>
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-400">
                Selecciona un paciente para asociarlo automáticamente.
              </p>
            )}
          </div>

          {value.patient_id && (
            <button
              type="button"
              onClick={clear}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      {/* Buscador */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full">
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Buscar paciente
            </label>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void runSearch(search.trim());
                }
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              placeholder="Buscar por nombre, especie o raza…"
            />

            <p className="mt-1.5 text-[11px] text-slate-400">
              Escribe y presiona Enter, o usa el botón Buscar.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void runSearch(search.trim())}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:pointer-events-none disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Estado de error */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Loading: skeleton en vez de texto plano */}
      {loading && (
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-2/3 rounded-full bg-slate-200" />
                  <div className="h-2.5 w-1/3 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de pacientes */}
      {!loading && items.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Resultados
            </p>

            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
              {items.length} {items.length === 1 ? 'paciente' : 'pacientes'}
            </span>
          </div>

          <div className="grid max-h-96 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {items.map((p: any) => {
              const name = getPatientName(p, p.id);
              const species = getPatientSpecies(p);
              const breed = p?.breed || p?.raza || null;
              const extra = [species, breed].filter(Boolean).join(' · ');
              const tutorId = getTutorIdFromPatient(p);
              const active = value.patient_id === p.id;
              const theme = getSpeciesTheme(species);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  aria-pressed={active}
                  className={[
                    'group relative w-full rounded-2xl border px-3.5 py-3 text-left transition-all',
                    active
                      ? 'border-emerald-300 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-200'
                      : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
                  ].join(' ')}
                >
                  {active && (
                    <span className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-sm">
                      ✓
                    </span>
                  )}

                  <div className="flex items-start gap-3">
                    {/* Avatar por especie */}
                    <span
                      className={[
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ring-2',
                        theme.bg,
                        theme.ring,
                      ].join(' ')}
                      aria-hidden="true"
                    >
                      {theme.emoji}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 pr-6">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {highlightMatch(name, appliedSearch)}
                        </p>
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 group-hover:bg-slate-200">
                          Ficha #{p.id}
                        </span>

                        {extra && (
                          <span
                            className={[
                              'truncate rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              theme.bg,
                              theme.text,
                            ].join(' ')}
                          >
                            {extra}
                          </span>
                        )}
                      </div>

                      {tutorId && (
                        <p className="mt-1.5 truncate text-[11px] text-slate-400">
                          Tutor{' '}
                          <span className="font-semibold text-slate-500">
                            #{tutorId}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Vacío */}
      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
          <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg shadow-sm">
            🔍
          </span>
          <p className="text-sm font-semibold text-slate-700">
            {appliedSearch
              ? `Sin resultados para "${appliedSearch}".`
              : 'No hay pacientes para mostrar.'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Intenta buscar por nombre, especie o raza.
          </p>
        </div>
      )}
    </section>
  );
}