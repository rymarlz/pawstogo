// src/hospitalizations/pages/HospitalizationListPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchHospitalizations,
  deleteHospitalization,
} from '../api';
import type {
  Hospitalization,
  HospitalizationFilters,
  HospitalizationStatus,
  PaginatedResponse,
} from '../types';

type Meta = PaginatedResponse<Hospitalization>['meta'];

const STATUS_LABEL: Record<HospitalizationStatus, string> = {
  active: 'Activa',
  discharged: 'Alta',
  planned: 'Programada',
  cancelled: 'Cancelada',
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return value.slice(0, 10);
}

export function HospitalizationListPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Hospitalization[]>([]);
  const [filters, setFilters] = useState<HospitalizationFilters>({
    search: '',
    status: 'active',
    page: 1,
    per_page: 20,
  });
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function handleFilterChange<K extends keyof HospitalizationFilters>(
    key: K,
    value: HospitalizationFilters[K],
  ) {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? (value as number) : 1,
    }));
  }

  function canPrev() {
    if (!meta) return false;
    return meta.current_page > 1;
  }

  function canNext() {
    if (!meta) return false;
    return meta.current_page < meta.last_page;
  }

  function handleRefresh() {
    setRefreshKey(k => k + 1);
  }

  async function handleDelete(id: number) {
    if (!token) {
      alert('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    const ok = window.confirm(
      '¿Eliminar esta internación? Esta acción no se puede deshacer.',
    );
    if (!ok) return;

    try {
      await deleteHospitalization(token, id);
      handleRefresh();
    } catch (err: any) {
      console.error('Error eliminando internación:', err);
      alert(err?.message || 'No se pudo eliminar la internación.');
    }
  }

  useEffect(() => {
    async function load() {
      if (!token) {
        setError('Sesión no válida. Vuelve a iniciar sesión.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const res = (await fetchHospitalizations(
          token,
          filters,
        )) as PaginatedResponse<Hospitalization>;

        const data = Array.isArray(res.data) ? res.data : [];
        setRows(data);
        setMeta(res.meta ?? null);
      } catch (err: any) {
        console.error('Error cargando internaciones:', err);
        setError(
          err?.message || 'No se pudieron cargar las internaciones.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [
    token,
    filters.search,
    filters.status,
    filters.page,
    filters.per_page,
    filters.date_from,
    filters.date_to,
    filters.patient_id,
    refreshKey,
  ]);

  const totalLabel =
    meta?.total != null
      ? `${meta.total} registro${meta.total === 1 ? '' : 's'}`
      : `${rows.length} registro${rows.length === 1 ? '' : 's'}`;

  return (
    <DashboardLayout title="Internaciones / Hospitalización">
      {/* Encabezado */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Internaciones activas y registro histórico
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-slate-500">
            Administra pacientes hospitalizados, egresos y observación. Las
            internaciones se vinculan al paciente y su ficha clínica.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {totalLabel}
          </span>
          <button
            type="button"
            onClick={() =>
              navigate('/dashboard/internaciones/nueva')
            }
            className="btn"
          >
            Nueva internación
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          {/* Buscar */}
          <div className="w-full md:max-w-sm">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Buscar
            </label>
            <input
              type="search"
              className="input"
              placeholder="Paciente, tutor, motivo…"
              value={filters.search ?? ''}
              onChange={e =>
                handleFilterChange('search', e.target.value)
              }
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Búsqueda por nombre del paciente, motivo o datos del tutor.
            </p>
          </div>

          {/* Estado */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-48">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Estado
              </label>
              <select
                className="input"
                value={filters.status ?? 'active'}
                onChange={e =>
                  handleFilterChange(
                    'status',
                    e.target.value === 'all'
                      ? 'all'
                      : (e.target.value as HospitalizationStatus),
                  )
                }
              >
                <option value="active">Activas</option>
                <option value="planned">Programadas</option>
                <option value="discharged">Dadas de alta</option>
                <option value="cancelled">Canceladas</option>
                <option value="all">Todas</option>
              </select>
            </div>

            {/* Fechas opcionales (si luego las usas en backend) */}
            <div className="w-full sm:w-40">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Desde (ingreso)
              </label>
              <input
                type="date"
                className="input"
                value={filters.date_from ?? ''}
                onChange={e =>
                  handleFilterChange('date_from', e.target.value || undefined)
                }
              />
            </div>

            <div className="w-full sm:w-40">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Hasta (ingreso)
              </label>
              <input
                type="date"
                className="input"
                value={filters.date_to ?? ''}
                onChange={e =>
                  handleFilterChange('date_to', e.target.value || undefined)
                }
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

      {/* Estados carga / error */}
      {loading && (
        <div className="card text-sm text-slate-600">
          Cargando internaciones…
        </div>
      )}

      {error && !loading && (
        <div
          className="card text-xs"
          style={{
            borderColor: '#f97373',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      {/* Tabla */}
      {!loading && !error && (
        <>
          {rows.length === 0 ? (
            <div className="card py-8 text-center text-sm text-slate-500">
              No hay internaciones para los filtros seleccionados.
            </div>
          ) : (
            <div className="card p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Paciente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Motivo / diagnóstico de ingreso
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Ingreso / Alta
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Ubicación
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((h, index) => {
                      const anyH = h as any;
                      const isEven = index % 2 === 0;

                      const pacienteNombre =
                        anyH.patient?.name || `Paciente #${anyH.patient_id}`;
                      const tutorNombre =
                        anyH.patient?.tutor_name || '';

                      const ingreso = formatDate(anyH.admission_date);
                      const alta = formatDate(anyH.discharge_date);

                      const status = (anyH.status ??
                        'active') as HospitalizationStatus;

                      const room = anyH.room || '';
                      const bed = anyH.bed || '';

                      const ubicacion =
                        room || bed
                          ? [room, bed].filter(Boolean).join(' · ')
                          : '—';

                      let statusClass =
                        'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600';

                      if (status === 'active') {
                        statusClass =
                          'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700';
                      } else if (status === 'planned') {
                        statusClass =
                          'inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700';
                      } else if (status === 'discharged') {
                        statusClass =
                          'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700';
                      } else if (status === 'cancelled') {
                        statusClass =
                          'inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700';
                      }

                      return (
                        <tr
                          key={anyH.id}
                          style={{
                            backgroundColor: isEven
                              ? '#ffffff'
                              : '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          <td className="px-4 py-3 align-middle">
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-slate-800">
                                {pacienteNombre}
                              </span>
                              {tutorNombre && (
                                <span className="text-[11px] text-slate-500">
                                  Tutor: {tutorNombre}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle text-xs text-slate-700">
                            {anyH.reason || 'Sin motivo registrado'}
                          </td>
                          <td className="px-4 py-3 align-middle text-xs text-slate-700">
                            <div className="flex flex-col">
                              <span>Ingreso: {ingreso}</span>
                              <span>Alta: {alta}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span className={statusClass}>
                              {STATUS_LABEL[status] ?? status}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-xs text-slate-700">
                            {ubicacion}
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{
                                  fontSize: '11px',
                                  padding: '0.35rem 0.8rem',
                                }}
                                onClick={() =>
                                  navigate(
                                    `/dashboard/internaciones/${anyH.id}`,
                                  )
                                }
                              >
                                Ver / editar
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{
                                  fontSize: '11px',
                                  padding: '0.35rem 0.8rem',
                                  color: '#b91c1c',
                                }}
                                onClick={() => handleDelete(anyH.id)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
                  <div>
                    Página {meta.current_page} de {meta.last_page}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canPrev()}
                      onClick={() =>
                        setFilters(prev => ({
                          ...prev,
                          page: (prev.page ?? 1) - 1,
                        }))
                      }
                      className="rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={!canNext()}
                      onClick={() =>
                        setFilters(prev => ({
                          ...prev,
                          page: (prev.page ?? 1) + 1,
                        }))
                      }
                      className="rounded-xl border border-slate-300 px-3 py-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
