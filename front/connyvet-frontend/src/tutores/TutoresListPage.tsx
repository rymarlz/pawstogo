// src/pages/TutoresListPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { tutoresApi } from './api';
import type { Tutor, TutorListResponse, TutorListMeta } from './types';

export function TutoresListPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [meta, setMeta] = useState<TutorListMeta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        const res: TutorListResponse = await tutoresApi.list(
          {
            search: search || undefined,
            page: 1,
            per_page: 25,
          },
          token,
        );

        if (!active) return;

        // res.data SIEMPRE es array gracias a la normalización
        setTutores(Array.isArray(res.data) ? res.data : []);
        setMeta(res.meta);
      } catch (err: any) {
        if (!active) return;
        console.error('Error cargando tutores:', err);
        setError(
          err?.message || 'No se pudieron cargar los tutores.',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [token, search, refreshKey]);

  function handleRefresh() {
    setRefreshKey((k) => k + 1);
  }

  function goToDetail(id: number) {
    navigate(`/dashboard/tutores/${id}`);
  }

  function goToCreate() {
    navigate('/dashboard/tutores/nuevo');
  }

  const totalLabel =
    meta?.total != null
      ? `${meta.total} tutor${meta.total === 1 ? '' : 'es'}`
      : `${tutores.length} tutor${tutores.length === 1 ? '' : 'es'}`;

  return (
    <DashboardLayout title="Tutores">
      {/* Barra superior: título + resumen */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Registro de tutores
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Administra los datos de los tutores (propietarios) que
            se asocian a los pacientes de la clínica.
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1">
            {totalLabel}
          </span>
        </div>
      </div>

      {/* Filtro + acciones */}
      <div className="card mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-sm">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Buscar tutor
            </label>
            <input
              type="search"
              placeholder="Nombre, correo, RUT o teléfono…"
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              La búsqueda aplica sobre nombre, apellido, correo y RUT.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleRefresh}
              className="btn-ghost"
            >
              Actualizar listado
            </button>
            <button
              type="button"
              onClick={goToCreate}
              className="btn-accent"
            >
              Nuevo tutor
            </button>
          </div>
        </div>
      </div>

      {/* Estados de carga / error */}
      {loading && (
        <div className="card text-sm text-slate-600">
          Cargando tutores…
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

      {/* Tabla / listado */}
      {!loading && !error && (
        <>
          {tutores.length === 0 ? (
            <div className="card text-sm text-slate-500 text-center py-8">
              No hay tutores registrados o no se encontraron resultados
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
                        Tutor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Correo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Teléfono
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Dirección
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tutores.map((tutor, index) => {
                      const nombreCompleto = [
                        tutor.nombres,
                        tutor.apellidos,
                      ]
                        .filter(Boolean)
                        .join(' ');

                      const isEven = index % 2 === 0;

                      return (
                        <tr
                          key={tutor.id}
                          style={{
                            backgroundColor: isEven
                              ? '#ffffff'
                              : '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                            cursor: 'pointer',
                          }}
                          onClick={() => goToDetail(tutor.id)}
                        >
                          <td className="px-4 py-3 align-middle">
                            <div className="flex flex-col">
                              <span className="text-slate-800 font-medium">
                                {nombreCompleto || 'Sin nombre'}
                              </span>
                              {tutor.rut && (
                                <span className="text-[11px] text-slate-500">
                                  RUT: {tutor.rut}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {tutor.email || '—'}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {tutor.telefono_movil ||
                              tutor.telefono_fijo ||
                              '—'}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {tutor.direccion || '—'}
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                goToDetail(tutor.id);
                              }}
                              className="btn-ghost"
                              style={{
                                fontSize: '11px',
                                padding: '0.35rem 0.8rem',
                              }}
                            >
                              Ver detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {meta && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-[11px] text-slate-500">
                  <span>
                    Página {meta.current_page} de {meta.last_page}
                  </span>
                  <span>
                    Mostrando hasta {meta.per_page} registros por página
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
