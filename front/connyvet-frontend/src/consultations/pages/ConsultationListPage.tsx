// src/consultations/pages/ConsultationListPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { fetchConsultations, deleteConsultation } from '../api';
import type { Consultation, ConsultationFilters, ConsultationStatus } from '../types';

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

interface AnyConsultation extends Consultation {
  patient_name?: string;
  status_label?: string;
}

const STATUS_LABEL: Record<ConsultationStatus, string> = {
  abierta: 'Abierta',
  cerrada: 'Cerrada',
  anulada: 'Anulada',
};

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-CL');
}

export function ConsultationListPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [consultations, setConsultations] = useState<AnyConsultation[]>([]);
  const [filters, setFilters] = useState<ConsultationFilters>({
    search: '',
    status: 'all',
    page: 1,
    per_page: 20,
  });

  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

      const res = await fetchConsultations(token, filters);
      const data = (Array.isArray(res.data) ? res.data : []) as AnyConsultation[];

      const normalized = data.map(c => ({
        ...c,
        patient_name:
          c.patient?.name ||
          (c as any).patient_name ||
          (c as any).paciente_nombre ||
          '',
      }));

      setConsultations(normalized);
      setMeta((res.meta as any) ?? null);
    } catch (err: any) {
      console.error('Error cargando consultas:', err);
      setError(err?.message || 'No se pudieron cargar las consultas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.status, filters.page, token, refreshKey]);

  function handleFilterChange<K extends keyof ConsultationFilters>(field: K, value: ConsultationFilters[K]) {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
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
    navigate('/dashboard/consultas/nueva');
  }

  function goToDetail(id: number) {
    navigate(`/dashboard/consultas/${id}`);
  }

  function goToEdit(id: number) {
    navigate(`/dashboard/consultas/${id}/editar`);
  }

  async function handleDelete(id: number) {
    if (!token) {
      setError('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    const ok = window.confirm(
      '¿Eliminar esta consulta? El historial clínico asociado puede verse afectado.',
    );
    if (!ok) return;

    setDeleteError(null);
    try {
      await deleteConsultation(token, id);
      await load();
    } catch (err: any) {
      setDeleteError(err?.message || 'No se pudo eliminar la consulta.');
    }
  }

  const totalLabel =
    meta?.total != null
      ? `${meta.total} consulta${meta.total === 1 ? '' : 's'}`
      : `${consultations.length} consulta${consultations.length === 1 ? '' : 's'}`;

  return (
    <DashboardLayout title="Consultas clínicas">
      {/* ENCABEZADO */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Registro de consultas clínicas
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Visualiza y gestiona consultas: motivo, estado, paciente y fechas.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {totalLabel}
          </span>
          <button type="button" onClick={goToCreate} className="btn-accent">
            Nueva consulta
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="card mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-sm">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Buscar
            </label>
            <input
              type="search"
              placeholder="Paciente, motivo, notas…"
              className="input"
              value={filters.search ?? ''}
              onChange={e => handleFilterChange('search', e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Backend filtra por motivo/diagnósticos/anamnesis + paciente/tutor.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-40">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Estado
              </label>
              <select
                className="input"
                value={filters.status ?? 'all'}
                onChange={e =>
                  handleFilterChange('status', e.target.value as ConsultationFilters['status'])
                }
              >
                <option value="all">Todos</option>
                <option value="abierta">Abiertas</option>
                <option value="cerrada">Cerradas</option>
                <option value="anulada">Anuladas</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" onClick={handleRefresh} className="btn-ghost">
              Actualizar listado
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="card text-sm text-slate-600">Cargando consultas…</div>
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

      {deleteError && (
        <div
          className="mb-4 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
          role="alert"
        >
          <span>{deleteError}</span>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="shrink-0 rounded-lg px-2 py-1 hover:bg-rose-100"
            aria-label="Cerrar mensaje"
          >
            ✕
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {consultations.length === 0 ? (
            <div className="card text-sm text-slate-500 text-center py-8">
              No hay consultas registradas o no se encontraron resultados.
            </div>
          ) : (
            <div className="card p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Paciente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Motivo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Estado</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultations.map((c, index) => {
                      const isEven = index % 2 === 0;

                      const fecha = formatDateTime(c.date);
                      const paciente = c.patient_name || `Paciente #${c.patient_id}`;
                      const motivo = c.reason || '—';
                      const estado: ConsultationStatus = (c.status as ConsultationStatus) || 'abierta';

                      return (
                        <tr
                          key={c.id}
                          style={{
                            backgroundColor: isEven ? '#ffffff' : '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          <td className="px-4 py-3 align-middle text-slate-700">{fecha}</td>
                          <td className="px-4 py-3 align-middle text-slate-800">{paciente}</td>
                          <td className="px-4 py-3 align-middle text-slate-700">{motivo}</td>
                          <td className="px-4 py-3 align-middle">
                            <span
                              className={
                                estado === 'abierta'
                                  ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700'
                                  : estado === 'cerrada'
                                  ? 'inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700'
                                  : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600'
                              }
                            >
                              {STATUS_LABEL[estado] ?? estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ fontSize: '11px', padding: '0.35rem 0.8rem' }}
                                onClick={() => goToDetail(c.id)}
                              >
                                Ver
                              </button>

                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ fontSize: '11px', padding: '0.35rem 0.8rem' }}
                                onClick={() => goToEdit(c.id)}
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ fontSize: '11px', padding: '0.35rem 0.8rem', color: '#b91c1c' }}
                                onClick={() => handleDelete(c.id)}
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
                  <div>Página {meta.current_page} de {meta.last_page}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canPrev()}
                      onClick={() => setFilters(prev => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
                      className="rounded-xl border border-slate-300 px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={!canNext()}
                      onClick={() => setFilters(prev => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
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
