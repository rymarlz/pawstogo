// src/clinic/pages/PatientListPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { fetchPatients, deletePatient } from '../api';
import type { Patient, PatientFilters } from '../types';

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export function PatientListPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [filters, setFilters] = useState<PatientFilters>({
    search: '',
    species: '',
    active: 'all', // 'all' | 'true' | 'false'
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

      const res = await fetchPatients(token, filters);

      setPatients(Array.isArray(res.data) ? res.data : []);
      setMeta(res.meta ?? null);
    } catch (err: any) {
      console.error('Error cargando pacientes:', err);
      setError(err?.message || 'No se pudieron cargar los pacientes.');
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

  function handleFilterChange<K extends keyof PatientFilters>(
    field: K,
    value: PatientFilters[K],
  ) {
    setFilters((prev: PatientFilters) => ({
      ...prev,
      [field]: value,
      page: 1,
    }));
  }

  function handleRefresh() {
    setRefreshKey(k => k + 1);
  }

  async function handleDelete(id: number) {
    if (!token) {
      setError('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    const ok = window.confirm(
      '¿Eliminar este paciente? Esta acción no se puede deshacer y puede afectar fichas asociadas.',
    );
    if (!ok) return;

    setDeleteError(null);
    try {
      await deletePatient(token, id);
      await load();
    } catch (err: any) {
      setDeleteError(err?.message || 'No se pudo eliminar el paciente.');
    }
  }

  function canPrev() {
    if (!meta) return false;
    return meta.current_page > 1;
  }

  function canNext() {
    if (!meta) return false;
    return meta.current_page < meta.last_page;
  }

  const speciesLabel = (species: Patient['species']) => {
    switch (species) {
      case 'perro':
        return 'Perro';
      case 'gato':
        return 'Gato';
      case 'ave':
        return 'Ave';
      case 'roedor':
        return 'Roedor';
      case 'reptil':
        return 'Reptil';
      case 'otro':
        return 'Otro';
      default:
        return species;
    }
  };

  const totalLabel =
    meta?.total != null
      ? `${meta.total} paciente${meta.total === 1 ? '' : 's'}`
      : `${patients.length} paciente${patients.length === 1 ? '' : 's'}`;

  function goToCreate() {
    navigate('/dashboard/pacientes/nuevo');
  }

  // 👉 ahora este va al DETAIL (lectura)
  function goToDetail(id: number) {
    navigate(`/dashboard/pacientes/${id}`);
  }

  return (
    <DashboardLayout title="Pacientes">
      {/* ENCABEZADO */}
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Registro de pacientes
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Administra las mascotas atendidas en la clínica: especie, raza,
            tutor asociado y estado clínico.
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
            Nuevo paciente
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="card mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          {/* Buscar */}
          <div className="w-full md:max-w-sm">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Buscar paciente
            </label>
            <input
              type="search"
              placeholder="Nombre, RUT, tutor, chip…"
              className="input"
              value={filters.search}
              onChange={e =>
                handleFilterChange('search', e.target.value)
              }
            />
            <p className="mt-1 text-[11px] text-slate-400">
              La búsqueda aplica sobre nombre del paciente, identificadores y
              datos básicos del tutor.
            </p>
          </div>

          {/* Especie + estado */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-40">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Especie
              </label>
              <select
                className="input"
                value={filters.species}
                onChange={e =>
                  handleFilterChange(
                    'species',
                    e.target.value as '' | Patient['species'],
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
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Estado
              </label>
              <select
                className="input"
                value={filters.active}
                onChange={e =>
                  handleFilterChange(
                    'active',
                    e.target.value as PatientFilters['active'],
                  )
                }
              >
                <option value="all">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

      {/* ESTADOS: CARGA / ERROR */}
      {loading && (
        <div className="card text-sm text-slate-600">
          Cargando pacientes…
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

      {/* TABLA / LISTADO */}
      {!loading && !error && (
        <>
          {patients.length === 0 ? (
            <div className="card py-8 text-center text-sm text-slate-500">
              No hay pacientes registrados o no se encontraron resultados
              para la búsqueda actual.
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
                        Especie / raza
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">
                        Tutor
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
                    {patients.map((patient, index) => {
                      const p: any = patient;

                      const nombrePaciente =
                        p.name || p.nombre || 'Sin nombre';

                      const especieTexto = p.species
                        ? speciesLabel(p.species)
                        : '—';

                      const raza = p.breed || p.raza || '';

                      const tutorNombre =
                        p.tutor_name ||
                        p.tutor?.name ||
                        '—';

                      const activo =
                        typeof p.active === 'boolean'
                          ? p.active
                          : p.activo;

                      const isEven = index % 2 === 0;

                      const photoUrl: string | null = p.photo_url ?? null;

                      const inicial = nombrePaciente
                        ? nombrePaciente.charAt(0).toUpperCase()
                        : '?';

                      return (
                        <tr
                          key={p.id}
                          style={{
                            backgroundColor: isEven
                              ? '#ffffff'
                              : '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          <td className="px-4 py-3 align-middle">
                            <div className="flex items-center gap-3">
                              {/* Avatar / foto del paciente */}
                              {photoUrl ? (
                                <img
                                  src={photoUrl}
                                  alt={nombrePaciente}
                                  className="h-9 w-9 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-[11px] font-semibold text-slate-400">
                                  {inicial}
                                </div>
                              )}

                              <span className="font-medium text-slate-800">
                                {nombrePaciente}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {especieTexto}
                            {raza ? ` · ${raza}` : ''}
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {tutorNombre}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span
                              className={
                                activo
                                  ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700'
                                  : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600'
                              }
                            >
                              {activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-2">
                              {/* 👉 ahora abre el DETAIL */}
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{
                                  fontSize: '11px',
                                  padding: '0.35rem 0.8rem',
                                }}
                                onClick={() => goToDetail(p.id)}
                              >
                                Ver ficha
                              </button>

                              {/* 👉 Ver agenda de vacunas del paciente */}
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{
                                  fontSize: '11px',
                                  padding: '0.35rem 0.8rem',
                                }}
                                onClick={() =>
                                  navigate(
                                    `/dashboard/vacunas?patient_id=${p.id}`,
                                  )
                                }
                              >
                                Ver vacunas
                              </button>

                              {/* 👉 Agendar nueva vacuna para este paciente */}
                              <button
                                type="button"
                                className="btn"
                                style={{
                                  fontSize: '11px',
                                  padding: '0.35rem 0.9rem',
                                }}
                                onClick={() =>
                                  navigate(
                                    `/dashboard/vacunas/nueva?patient_id=${p.id}`,
                                  )
                                }
                              >
                                Agendar vacuna
                              </button>

                              <button
                                type="button"
                                className="btn-ghost"
                                style={{
                                  fontSize: '11px',
                                  padding: '0.35rem 0.8rem',
                                  color: '#b91c1c',
                                }}
                                onClick={() => handleDelete(p.id)}
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
                        setFilters((prev: PatientFilters) => ({
                          ...prev,
                          page: (prev.page ?? 1) - 1,
                        }))
                      }
                      className="rounded-xl border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-100"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={!canNext()}
                      onClick={() =>
                        setFilters((prev: PatientFilters) => ({
                          ...prev,
                          page: (prev.page ?? 1) + 1,
                        }))
                      }
                      className="rounded-xl border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-100"
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
