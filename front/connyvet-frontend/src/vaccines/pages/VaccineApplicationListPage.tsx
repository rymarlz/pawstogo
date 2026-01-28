// src/vaccines/pages/VaccineApplicationListPage.tsx
import { useEffect, useState } from 'react';
import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { apiFetch } from '../api';
import type { VaccineApplicationStatus } from '../types';

type VaccineApplication = {
  id: number;
  patient_id?: number | null;
  patient_name?: string | null;
  vaccine_id?: number | null;
  vaccine_name?: string | null;
  planned_date?: string | null;
  applied_at?: string | null;
  next_due_date?: string | null;
  status?: VaccineApplicationStatus;
  active?: boolean;
};

type Filters = {
  page: number;
  per_page: number;
  status: 'all' | VaccineApplicationStatus;
  date_from: string;
  date_to: string;
  patient_id?: string;
};

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type ListResponse = {
  data: VaccineApplication[];
  meta?: Meta;
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return value.split('T')[0] ?? value;
    }
    return d.toLocaleDateString('es-CL');
  } catch {
    return value ?? '—';
  }
}

function statusLabel(
  status: VaccineApplicationStatus | string | null | undefined,
): string {
  const s = (status || '').toString().toLowerCase();

  switch (s) {
    case 'pendiente':
      return 'Pendiente';
    case 'aplicada':
      return 'Aplicada';
    case 'omitida':
      return 'Omitida';
    case 'vencida':
      return 'Vencida';
    default:
      return '—';
  }
}

function statusBadgeClass(
  status: VaccineApplicationStatus | string | null | undefined,
): string {
  const s = (status || '').toString().toLowerCase();

  switch (s) {
    case 'pendiente':
      return 'bg-amber-50 text-amber-800';
    case 'aplicada':
      return 'bg-emerald-50 text-emerald-700';
    case 'omitida':
      return 'bg-rose-50 text-rose-700';
    case 'vencida':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function VaccineApplicationListPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const patientFromQuery = searchParams.get('patient_id') || '';

  const [filters, setFilters] = useState<Filters>(() => ({
    page: Number(searchParams.get('page')) || 1,
    per_page: 20,
    status:
      ((searchParams.get('status') as VaccineApplicationStatus) ??
        'all') || 'all',
    date_from: searchParams.get('date_from') || '',
    date_to: searchParams.get('date_to') || '',
    patient_id: patientFromQuery || undefined,
  }));

  const [items, setItems] = useState<VaccineApplication[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function syncSearchParams(next: Filters) {
    const params: Record<string, string> = {};

    if (next.page && next.page !== 1) params.page = String(next.page);
    if (next.status && next.status !== 'all') {
      params.status = next.status;
    }
    if (next.date_from) params.date_from = next.date_from;
    if (next.date_to) params.date_to = next.date_to;
    if (next.patient_id) params.patient_id = next.patient_id;

    setSearchParams(params, { replace: true });
  }

  async function load() {
    if (!token) {
      setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorBanner(null);

      const query: Record<string, string | number | undefined> = {
        page: filters.page,
        per_page: filters.per_page,
      };

      if (filters.status !== 'all') {
        query.status = filters.status;
      }
      if (filters.date_from) {
        query.date_from = filters.date_from;
      }
      if (filters.date_to) {
        query.date_to = filters.date_to;
      }
      if (filters.patient_id) {
        query.patient_id = filters.patient_id;
      }

      const res = await apiFetch<ListResponse>(
        '/vaccine-applications',
        {
          method: 'GET',
          token,
          params: query,
        },
      );

      setItems(Array.isArray(res.data) ? res.data : []);
      setMeta(res.meta ?? null);
    } catch (err: any) {
      console.error('Error cargando aplicaciones de vacunas:', err);
      setErrorBanner(
        err?.messageApi ||
          err?.response?.data?.message ||
          err?.message ||
          'No se pudo cargar la agenda de vacunas.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    syncSearchParams(filters);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.page,
    filters.status,
    filters.date_from,
    filters.date_to,
    filters.patient_id,
    token,
    refreshKey,
  ]);

  function handleFilterChange<K extends keyof Filters>(
    key: K,
    value: Filters[K],
  ) {
    if (key === 'page') {
      setFilters(prev => ({
        ...prev,
        page: value as number,
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [key]: value,
        page: 1,
      }));
    }
  }

  function handleClearPatientFilter() {
    setFilters(prev => ({
      ...prev,
      patient_id: undefined,
      page: 1,
    }));
  }

  function handleRefresh() {
    setRefreshKey(k => k + 1);
  }

  function canPrev() {
    if (!meta) return false;
    return meta.current_page > 1;
  }

  function canNext() {
    if (!meta) return false;
    return meta.current_page < meta.last_page;
  }

  async function handleDelete(appId: number) {
    if (!token) {
      alert('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    const ok = window.confirm(
      '¿Eliminar este registro de vacunación? Esta acción no se puede deshacer.',
    );
    if (!ok) return;

    try {
      await apiFetch<void>(`/vaccine-applications/${appId}`, {
        method: 'DELETE',
        token,
      });
      await load();
    } catch (err: any) {
      console.error('Error eliminando vacunación:', err);
      alert(
        err?.messageApi ||
          err?.response?.data?.message ||
          err?.message ||
          'No se pudo eliminar la vacunación.',
      );
    }
  }

  function goToCreate() {
    if (filters.patient_id) {
      navigate(
        `/dashboard/vacunas/nueva?patient_id=${filters.patient_id}`,
      );
    } else {
      navigate('/dashboard/vacunas/nueva');
    }
  }

  function goToEdit(id: number) {
    navigate(`/dashboard/vacunas/${id}`);
  }

  const totalLabel =
    meta?.total != null
      ? `${meta.total} registro${
          meta.total === 1 ? '' : 's'
        } de vacunas`
      : `${items.length} registro${
          items.length === 1 ? '' : 's'
        } de vacunas`;

  const isFilteredByPatient = !!filters.patient_id;

  return (
    <DashboardLayout title="Agenda de vacunas">
      {/* HEADER */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Agenda de aplicaciones de vacunas
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Visualiza y gestiona las aplicaciones de vacunas por paciente,
            estado y rango de fechas. Desde aquí puedes registrar nuevas
            vacunas o actualizar el estado de las ya programadas.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {totalLabel}
          </span>
          <button
            type="button"
            onClick={goToCreate}
            className="btn-accent"
          >
            Nueva vacunación
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="card mb-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,0.8fr)] md:items-end">
          {/* Estado */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600">
              Estado
            </label>
            <select
              className="input"
              value={filters.status}
              onChange={e =>
                handleFilterChange(
                  'status',
                  e.target.value as Filters['status'],
                )
              }
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="aplicada">Aplicada</option>
              <option value="omitida">Omitida</option>
              <option value="vencida">Vencida</option>
            </select>
            <p className="text-[11px] text-slate-400">
              Filtra la agenda por estado clínico de la vacunación.
            </p>
          </div>

          {/* Rango de fechas */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-600">
                Desde (fecha planificada)
              </label>
              <input
                type="date"
                className="input"
                value={filters.date_from}
                onChange={e =>
                  handleFilterChange('date_from', e.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-600">
                Hasta (fecha planificada)
              </label>
              <input
                type="date"
                className="input"
                value={filters.date_to}
                onChange={e =>
                  handleFilterChange('date_to', e.target.value)
                }
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {isFilteredByPatient && (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700">
                <span>
                  Filtrado por paciente ID:{' '}
                  <strong>{filters.patient_id}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleClearPatientFilter}
                  className="text-[10px] underline decoration-dotted"
                >
                  Quitar filtro
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              className="btn-ghost"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* ESTADOS */}
      {loading && (
        <div className="card text-sm text-slate-600">
          Cargando agenda de vacunas…
        </div>
      )}

      {errorBanner && !loading && (
        <div className="card text-xs border border-rose-200 bg-rose-50 text-rose-700">
          {errorBanner}
        </div>
      )}

      {/* TABLA */}
      {!loading && !errorBanner && (
        <>
          {items.length === 0 ? (
            <div className="card text-xs text-slate-500">
              No se encontraron registros de vacunas con los filtros
              seleccionados.
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                    <th className="px-3 py-2 text-left font-medium">
                      Paciente
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Vacuna
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Fecha planificada
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Aplicada en
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Próxima dosis
                    </th>
                    <th className="px-3 py-2 text-left font-medium">
                      Estado
                    </th>
                    <th className="px-3 py-2 text-right font-medium">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">
                            {item.patient_name ||
                              (item.patient_id
                                ? `Paciente #${item.patient_id}`
                                : '—')}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="text-slate-700">
                          {item.vaccine_name ||
                            (item.vaccine_id
                              ? `Vacuna #${item.vaccine_id}`
                              : '—')}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        {formatDate(item.planned_date)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {formatDate(item.applied_at)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {formatDate(item.next_due_date)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${statusBadgeClass(
                            item.status,
                          )}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => goToEdit(item.id)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                          >
                            Ver / editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-100"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Paginación */}
              {meta && meta.last_page > 1 && (
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <div>
                    Página {meta.current_page} de {meta.last_page}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!canPrev()}
                      onClick={() =>
                        handleFilterChange(
                          'page',
                          Math.max(1, meta.current_page - 1),
                        )
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={!canNext()}
                      onClick={() =>
                        handleFilterChange(
                          'page',
                          Math.min(meta.last_page, meta.current_page + 1),
                        )
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
