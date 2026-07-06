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

export function PatientPicker({ token, value, onChange }: Props) {
  const [search, setSearch] = useState('');
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

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, value.patient_id]);

  async function runSearch(term: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPatients(token, { search: term, page: 1, per_page: 15 } as any);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar la lista de pacientes.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void runSearch(''); }, []); // eslint-disable-line

  const selectedLabel = useMemo(() => {
    if (!value.patient_id) return 'Sin paciente seleccionado';
    const p = value.patient;
    const name = p?.name || p?.nombre || p?.pet_name || `Paciente #${value.patient_id}`;
    return name;
  }, [value.patient_id, value.patient]);

  function pick(p: any) {
    onChange({
      patient_id: p.id ?? null,
      tutor_id: getTutorIdFromPatient(p),
      patient: p,
    });
  }

  function clear() {
    onChange({ patient_id: null, tutor_id: null, patient: null });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Paciente</p>
          <p className="text-sm font-semibold text-slate-800">{selectedLabel}</p>
          {value.tutor_id && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              Tutor asociado: <span className="font-medium">#{value.tutor_id}</span>
            </p>
          )}
        </div>

        {value.patient_id && (
          <button
            type="button"
            onClick={clear}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
          >
            Quitar
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <div className="w-full">
          <label className="mb-1 block text-xs font-medium text-slate-600">Buscar paciente</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void runSearch(search.trim());
              }
            }}
            className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Nombre, especie… (Enter para buscar)"
          />
          <p className="mt-1 text-[11px] text-slate-400">Escribe y presiona Enter.</p>
        </div>

        <button
          type="button"
          onClick={() => void runSearch(search.trim())}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-slate-800"
        >
          Buscar
        </button>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
          Cargando pacientes…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
          {error}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="max-h-56 overflow-auto rounded-2xl border border-slate-200">
          {items.map((p: any) => {
            const name = p.name || p.nombre || p.pet_name || `Paciente #${p.id}`;
            const extra = [p.species, p.breed].filter(Boolean).join(' · ');
            const active = value.patient_id === p.id;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p)}
                className={`w-full text-left px-3 py-2 border-b border-slate-100 hover:bg-slate-50 ${
                  active ? 'bg-emerald-50' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-800">{name}</span>
                  <span className="text-[11px] text-slate-400">#{p.id}</span>
                </div>
                {extra && <div className="text-[11px] text-slate-500">{extra}</div>}
              </button>
            );
          })}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
          No hay resultados.
        </div>
      )}
    </section>
  );
}
