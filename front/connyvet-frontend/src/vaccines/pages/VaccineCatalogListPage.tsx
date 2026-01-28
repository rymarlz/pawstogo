// src/vaccines/pages/VaccineCatalogListPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { apiFetch } from '../api';
import type { PaginatedResponse, Vaccine } from '../types';

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type Filters = {
  search: string;
  species: string;
  active: 'all' | 'active' | 'inactive';
  page: number;
  per_page: number;
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function VaccineCatalogListPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    species: '',
    active: 'all',
    page: 1,
    per_page: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function load() {
    if (!token) {
      setError('Sesión no válida. Vuelve a iniciar sesión.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.search.trim()) {
        params.set('search', filters.search.trim());
      }
      if (filters.species.trim()) {
        params.set('species', filters.species.trim());
      }
      if (filters.active === 'active') {
        params.set('active', '1');
      } else if (filters.active === 'inactive') {
        params.set('active', '0');
      }
      params.set('page', String(filters.page));
      params.set('per_page', String(filters.per_page));

      const res = await apiFetch<PaginatedResponse<Vaccine>>(
        `/vaccines?${params.toString()}`,
        { method: 'GET', token },
      );

      const data = Array.isArray(res.data) ? res.data : [];
      setVaccines(data);
      setMeta((res as any).meta ?? null);
    } catch (err: any) {
      console.error('Error cargando catálogo de vacunas:', err);
      setError(
        err?.message ||
          'No se pudieron cargar las vacunas del catálogo.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.search,
    filters.species,
    filters.active,
    filters.page,
    token,
    refreshKey,
  ]);

  function handleFilterChange<K extends keyof Filters>(
    field: K,
    value: Filters[K],
  ) {
    setFilters(prev => ({
      ...prev,
      [field]: value,
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

  function goToCreate() {
    // 🔧 corregido: coincide con App.tsx -> "/dashboard/catalogo-vacunas/nueva"
    navigate('/dashboard/catalogo-vacunas/nueva');
  }

  function goToEdit(id: number) {
    navigate(`/dashboard/catalogo-vacunas/${id}`);
  }

  const totalLabel =
    meta?.total != null
      ? `${meta.total} vacuna${meta.total === 1 ? '' : 's'}`
      : `${vaccines.length} vacuna${vaccines.length === 1 ? '' : 's'}`;

  return (
    <DashboardLayout title="Catálogo de vacunas">
      {/* Encabezado */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Catálogo de vacunas
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Define las vacunas disponibles en la clínica: nombre, especie,
            descripción, dosis e intervalos sugeridos. Este catálogo se usa
            en la agenda de vacunas y en las fichas de pacientes.
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
            Nueva vacuna
          </button>
  
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-sm">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Buscar
            </label>
            <input
              type="search"
              className="input"
              placeholder="Nombre, descripción…"
              value={filters.search}
              onChange={e =>
                handleFilterChange('search', e.target.value)
              }
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-40">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Especie
              </label>
              <input
                type="text"
                className="input"
                placeholder="Perro, gato…"
                value={filters.species}
                onChange={e =>
                  handleFilterChange('species', e.target.value)
                }
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Estado
              </label>
              <select
                className="input"
                value={filters.active}
                onChange={e =>
                  handleFilterChange(
                    'active',
                    e.target.value as Filters['active'],
                  )
                }
              >
                <option value="all">Todas</option>
                <option value="active">Solo activas</option>
                <option value="inactive">Solo inactivas</option>
              </select>
            </div>
          </div>

          <div className="flex flex-row items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="btn-ghost"
              disabled={loading}
            >
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* Estados */}
      {loading && (
        <div className="card text-sm text-slate-600">
          Cargando catálogo de vacunas…
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
          {vaccines.length === 0 ? (
            <div className="card py-8 text-center text-sm text-slate-500">
              No hay vacunas registradas o no se encontraron resultados
              para los filtros actuales.
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
                        Nombre
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Especie
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Descripción
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Intervalo / dosis sugeridos
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Última actualización
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaccines.map((v, index) => {
                      const isEven = index % 2 === 0;
                      const anyV = v as any;
                      const active =
                        typeof anyV.active === 'boolean'
                          ? anyV.active
                          : true;
                      const interval =
                        anyV.default_interval_days != null
                          ? `${anyV.default_interval_days} días`
                          : '—';
                      const dose =
                        anyV.default_dose_ml != null
                          ? `${anyV.default_dose_ml} ml`
                          : '—';
                      const isCore = !!anyV.is_core;

                      return (
                        <tr
                          key={v.id}
                          style={{
                            backgroundColor: isEven
                              ? '#ffffff'
                              : '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          <td className="px-4 py-3 align-middle text-slate-800">
                            {v.name}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {v.species || '—'}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {isCore ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                                Núcleo
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                No núcleo
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {v.short_description || '—'}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700 text-xs">
                            <div>
                              <span className="font-medium">
                                Intervalo:
                              </span>{' '}
                              {interval}
                            </div>
                            <div>
                              <span className="font-medium">
                                Dosis:
                              </span>{' '}
                              {dose}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700 text-xs">
                            {formatDate(v.updated_at || v.created_at)}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span
                              className={
                                active
                                  ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700'
                                  : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600'
                              }
                            >
                              {active ? 'Activa' : 'Inactiva'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            <button
                              type="button"
                              className="btn-ghost text-[11px]"
                              onClick={() => goToEdit(v.id)}
                            >
                              Ver / editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

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
