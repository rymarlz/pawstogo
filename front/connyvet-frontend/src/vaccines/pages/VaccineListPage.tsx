// src/vaccines/pages/VaccineListPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchVaccines,
  deleteVaccine,
} from '../api';
import type { Vaccine, VaccineFilters, PaginatedResponse } from '../types';

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export function VaccineListPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [filters, setFilters] = useState<VaccineFilters>({
    search: '',
    species: '',
    active: 'all',
    page: 1,
    per_page: 20,
  });
  const [meta, setMeta] = useState<Meta | null>(null);
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

      const res = (await fetchVaccines(
        token,
        filters,
      )) as PaginatedResponse<Vaccine>;

      const data = Array.isArray(res.data) ? res.data : [];
      setVaccines(data);
      setMeta(res.meta ?? null);
    } catch (err: any) {
      console.error('Error cargando vacunas:', err);
      setError(err?.message || 'No se pudieron cargar las vacunas.');
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

  function handleFilterChange<K extends keyof VaccineFilters>(
    field: K,
    value: VaccineFilters[K],
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
    navigate('/dashboard/catalogo-vacunas/nueva');
  }

  function goToEdit(id: number) {
    navigate(`/dashboard/catalogo-vacunas/${id}`);
  }

  async function handleDelete(id: number) {
    if (!token) {
      alert('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    const ok = window.confirm(
      '¿Eliminar esta vacuna del catálogo? Las aplicaciones históricas no se eliminarán.',
    );
    if (!ok) return;

    try {
      await deleteVaccine(token, id);
      await load();
    } catch (err: any) {
      console.error('Error eliminando vacuna:', err);
      alert(err?.message || 'No se pudo eliminar la vacuna.');
    }
  }

  const totalLabel =
    meta?.total != null
      ? `${meta.total} vacuna${meta.total === 1 ? '' : 's'}`
      : `${vaccines.length} vacuna${vaccines.length === 1 ? '' : 's'}`;

  return (
    <DashboardLayout title="Catálogo de vacunas">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Vacunas configuradas en la clínica
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Administra el catálogo de vacunas: especies objetivo, intervalos
            de refuerzo y estado de uso en la clínica.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {totalLabel}
          </span>
          <button
            type="button"
            onClick={goToCreate}
            className="btn"
          >
            Nueva vacuna
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          {/* Buscar */}
          <div className="w-full md:max-w-sm">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Buscar
            </label>
            <input
              type="search"
              placeholder="Nombre, descripción…"
              className="input"
              value={filters.search ?? ''}
              onChange={e =>
                handleFilterChange('search', e.target.value)
              }
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Aplica sobre nombre y descripciones de la vacuna.
            </p>
          </div>

          {/* Especie + estado */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-40">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Especie
              </label>
              <select
                className="input"
                value={filters.species ?? ''}
                onChange={e =>
                  handleFilterChange(
                    'species',
                    e.target.value || '',
                  )
                }
              >
                <option value="">Todas</option>
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
                <option value="ave">Ave</option>
                <option value="roedor">Roedor</option>
                <option value="reptil">Reptil</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="w-full sm:w-40">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Estado
              </label>
              <select
                className="input"
                value={filters.active ?? 'all'}
                onChange={e =>
                  handleFilterChange(
                    'active',
                    e.target.value as VaccineFilters['active'],
                  )
                }
              >
                <option value="all">Todas</option>
                <option value="true">Activas</option>
                <option value="false">Inactivas</option>
              </select>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              to="/dashboard/vacunas"
              className="btn-ghost text-[11px]"
            >
              Ir a agenda de vacunas
            </Link>
            <button
              type="button"
              onClick={handleRefresh}
              className="btn-ghost"
            >
              Actualizar listado
            </button>
          </div>
        </div>
      </div>

      {/* Estados */}
      {loading && (
        <div className="card text-sm text-slate-600">
          Cargando vacunas…
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
            <div className="card text-sm text-slate-500 text-center py-8">
              No hay vacunas registradas o no se encontraron resultados
              para la búsqueda actual.
            </div>
          ) : (
            <div className="card p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr
                      style={{
                        backgroundColor: '#f9fafb',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Vacuna
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Especie
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Fabricante
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Intervalo refuerzo
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
                      const intervalo = v.default_interval_days
                        ? `${v.default_interval_days} días`
                        : '—';

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
                          <td className="px-4 py-3 align-middle">
                            <div className="flex flex-col">
                              <span className="text-slate-800 font-medium">
                                {v.name}
                              </span>
                              {v.short_description && (
                                <span className="text-[11px] text-slate-500">
                                  {v.short_description}
                                </span>
                              )}
                              {v.is_core && (
                                <span className="mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
                                  Vacuna core
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {v.species || '—'}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {v.manufacturer || '—'}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {intervalo}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span
                              className={
                                v.active
                                  ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700'
                                  : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600'
                              }
                            >
                              {v.active ? 'Activa' : 'Inactiva'}
                            </span>
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
                                onClick={() => goToEdit(v.id)}
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
                                onClick={() => handleDelete(v.id)}
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

              {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-[11px] text-slate-500">
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
                      className="rounded-xl border border-slate-300 px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
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
                      className="rounded-xl border border-slate-300 px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
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
