// src/clinic/components/PatientVaccinesSection.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchVaccineApplications,
  deleteVaccineApplication,
} from '../../vaccines/api';
import type {
  VaccineApplication,
  VaccineApplicationFilters,
  VaccineApplicationStatus,
  PaginatedResponse,
} from '../../vaccines/types';

type Props = {
  patientId: number | null;
  patientName?: string; // opcional, por si quieres mostrar el nombre en el texto
};

// Helpers
const STATUS_LABEL: Record<VaccineApplicationStatus, string> = {
  pendiente: 'Pendiente',
  aplicada: 'Aplicada',
  omitida: 'Omitida',
  vencida: 'Vencida',
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return value.slice(0, 10);
}

export function PatientVaccinesSection({ patientId, patientName }: Props) {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [apps, setApps] = useState<VaccineApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // cargar aplicaciones SOLO si tenemos patientId y token
  useEffect(() => {
    async function load() {
      if (!token || !patientId) {
        setApps([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const filters: VaccineApplicationFilters = {
          patient_id: patientId, // 👈 filtro correcto por paciente
          // ⚠️ NO mandamos status: 'all' si el tipo no lo permite
          page: 1,
          per_page: 10,
        };

        const res = (await fetchVaccineApplications(
          token,
          filters,
        )) as PaginatedResponse<VaccineApplication>;

        const data = Array.isArray(res.data) ? res.data : [];
        setApps(data);
      } catch (err: any) {
        console.error('Error cargando vacunas del paciente:', err);
        setError(
          err?.message ||
            'No se pudieron cargar las vacunas de este paciente.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, patientId, refreshKey]);

  function handleRefresh() {
    setRefreshKey(k => k + 1);
  }

  function goToAgenda() {
    navigate('/dashboard/vacunas');
  }

  function goToCreateForPatient() {
    if (!patientId) return;
    navigate(`/dashboard/vacunas/nueva?patient_id=${patientId}`);
  }

  async function handleDelete(id: number) {
    if (!token) {
      alert('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    const ok = window.confirm(
      '¿Eliminar este registro de vacunación? El historial clínico podría verse afectado.',
    );
    if (!ok) return;

    try {
      await deleteVaccineApplication(token, id);
      handleRefresh();
    } catch (err: any) {
      console.error('Error eliminando vacunación:', err);
      alert(
        err?.message ||
          'No se pudo eliminar el registro de vacunación.',
      );
    }
  }

  // Si todavía no hay patientId (paciente sin guardar) mostramos info suave
  if (!patientId) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm text-xs mt-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Vacunas y recordatorios del paciente
        </h3>
        <p className="text-xs text-slate-500">
          Guarda primero la ficha del paciente para poder registrar y
          consultar sus vacunas y recordatorios.
        </p>
      </section>
    );
  }

  const titleName = patientName || 'este paciente';

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm mt-4">
      {/* Encabezado */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Vacunas y recordatorios del paciente
          </h3>
          <p className="text-xs text-slate-500 max-w-xl">
            Registra y revisa las vacunas aplicadas o pendientes de{' '}
            <span className="font-semibold">{titleName}</span>. Esta
            información se sincroniza con la agenda general de vacunas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <button
            type="button"
            onClick={goToCreateForPatient}
            className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-emerald-500"
          >
            Registrar vacunación para este paciente
          </button>
          <button
            type="button"
            onClick={goToAgenda}
            className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
          >
            Ver agenda completa
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-100"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Estados */}
      {loading && (
        <p className="text-xs text-slate-600">
          Cargando vacunas del paciente…
        </p>
      )}

      {error && !loading && (
        <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {apps.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4 text-xs text-slate-600">
              Este paciente aún no tiene vacunas registradas en el
              sistema. Puedes registrar la primera usando el botón
              <span className="font-semibold">
                {' '}
                “Registrar vacunación”.
              </span>
            </div>
          ) : (
            <div className="mt-2 overflow-x-auto text-xs">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr
                    style={{
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    <th className="px-3 py-2 text-left font-medium text-slate-500">
                      Fecha programada
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">
                      Vacuna
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">
                      Próximo refuerzo
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">
                      Estado
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a, index) => {
                    const isEven = index % 2 === 0;
                    const fecha = formatDate(a.planned_date);
                    const refuerzo = formatDate(a.next_due_date);
                    const estado = a.status as VaccineApplicationStatus;

                    let vacunaLabel = '—';
                    if (a.vaccine && typeof a.vaccine === 'object') {
                      vacunaLabel = a.vaccine.name;
                    } else if (typeof (a as any).vaccine === 'string') {
                      vacunaLabel = (a as any).vaccine as string;
                    }

                    return (
                      <tr
                        key={a.id}
                        style={{
                          backgroundColor: isEven ? '#ffffff' : '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        <td className="px-3 py-2 align-middle text-slate-700">
                          {fecha}
                        </td>
                        <td className="px-3 py-2 align-middle text-slate-700">
                          {vacunaLabel}
                        </td>
                        <td className="px-3 py-2 align-middle text-slate-700">
                          {refuerzo}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span
                            className={
                              estado === 'pendiente'
                                ? 'inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700'
                                : estado === 'aplicada'
                                ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700'
                                : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600'
                            }
                          >
                            {STATUS_LABEL[estado] ?? estado}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-middle text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{
                                fontSize: '11px',
                                padding: '0.25rem 0.7rem',
                              }}
                              onClick={() =>
                                navigate(`/dashboard/vacunas/${a.id}`)
                              }
                            >
                              Ver / editar
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{
                                fontSize: '11px',
                                padding: '0.25rem 0.7rem',
                                color: '#b91c1c',
                              }}
                              onClick={() => handleDelete(a.id)}
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
          )}
        </>
      )}
    </section>
  );
}
