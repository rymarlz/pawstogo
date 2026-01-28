// src/clinic/components/PatientConsultationsSection.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { fetchConsultations } from '../../consultations/api';
import type {
  Consultation,
  ConsultationFilters,
  PaginatedResponse,
} from '../../consultations/types';

type Props = {
  patientId: number | null;
  patientName?: string;
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return value.includes('T') ? value.split('T')[0] : value;
    }
    return d.toLocaleDateString('es-CL');
  } catch {
    return value ?? '—';
  }
}

export function PatientConsultationsSection({
  patientId,
  patientName,
}: Props) {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function load() {
      if (!token || !patientId) {
        setItems([]);
        return;
      }

      try {
        setLoading(true);
        setErrorBanner(null);

        const filters: ConsultationFilters = {
          patient_id: patientId,
          page: 1,
          per_page: 10,
        };

        const res =
          (await fetchConsultations(
            token,
            filters,
          )) as PaginatedResponse<Consultation>;

        const data = Array.isArray(res.data) ? res.data : [];
        setItems(data);
      } catch (err: any) {
        console.error(
          'Error cargando consultas del paciente:',
          err,
        );
        setErrorBanner(
          err?.messageApi ||
            err?.response?.data?.message ||
            err?.message ||
            'No se pudieron cargar las consultas de este paciente.',
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

  function goToConsultationsList() {
    if (!patientId) {
      navigate('/dashboard/consultas');
      return;
    }
    navigate(`/dashboard/consultas?patient_id=${patientId}`);
  }

  function goToCreateConsultation() {
    if (!patientId) return;
    navigate(`/dashboard/consultas/nueva?patient_id=${patientId}`);
  }

  function goToEdit(id: number) {
    navigate(`/dashboard/consultas/${id}`);
  }

  // Si aún no hay paciente guardado
  if (!patientId) {
    return (
      <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-slate-900">
          Historial de consultas
        </h3>
        <p className="text-xs text-slate-500">
          Guarda primero la ficha del paciente para poder registrar y
          revisar sus consultas clínicas.
        </p>
      </section>
    );
  }

  const titleName = patientName || 'este paciente';

  return (
    <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
      {/* Encabezado */}
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Historial de consultas
          </h3>
          <p className="max-w-xl text-xs text-slate-500">
            Consultas médicas asociadas a{' '}
            <span className="font-semibold">{titleName}</span>:
            diagnósticos, motivos de consulta y fechas de atención.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px]">
          <button
            type="button"
            onClick={goToCreateConsultation}
            className="inline-flex items-center rounded-xl bg-slate-800 px-3 py-1.5 font-medium text-white shadow-sm hover:bg-slate-700"
          >
            Nueva consulta
          </button>
          <button
            type="button"
            onClick={goToConsultationsList}
            className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
          >
            Ver todas las consultas
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
          Cargando consultas del paciente…
        </p>
      )}

      {errorBanner && !loading && (
        <div className="mt-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorBanner}
        </div>
      )}

      {!loading && !errorBanner && (
        <>
          {items.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-4 text-xs text-slate-600">
              Este paciente aún no tiene consultas registradas en el
              sistema. Puedes crear la primera usando el botón
              <span className="font-semibold"> “Nueva consulta”.</span>
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
                      Fecha
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">
                      Motivo / diagnóstico
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">
                      Profesional
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
                  {items.map((c, index) => {
                    const anyC = c as any;
                    const isEven = index % 2 === 0;

                    const fecha =
                      anyC.date ||
                      anyC.fecha ||
                      anyC.performed_at ||
                      anyC.created_at ||
                      null;

                    const motivo =
                      anyC.reason ||
                      anyC.motivo ||
                      anyC.diagnosis ||
                      anyC.resumen ||
                      '—';

                    const profesional =
                      anyC.doctor_name ||
                      anyC.vet_name ||
                      anyC.professional_name ||
                      anyC.doctor?.name ||
                      anyC.vet?.name ||
                      '—';

                    const status =
                      (anyC.status as string | undefined) || '';

                    return (
                      <tr
                        key={anyC.id}
                        style={{
                          backgroundColor: isEven ? '#ffffff' : '#f9fafb',
                          borderBottom: '1px solid #e5e7eb',
                        }}
                      >
                        <td className="px-3 py-2 align-middle text-slate-700">
                          {formatDate(fecha)}
                        </td>
                        <td className="px-3 py-2 align-middle text-slate-700">
                          {motivo}
                        </td>
                        <td className="px-3 py-2 align-middle text-slate-700">
                          {profesional}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {status ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                              {status}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-middle text-right">
                          <button
                            type="button"
                            onClick={() => goToEdit(anyC.id)}
                            className="btn-ghost"
                            style={{
                              fontSize: '11px',
                              padding: '0.25rem 0.7rem',
                            }}
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
          )}
        </>
      )}
    </section>
  );
}
