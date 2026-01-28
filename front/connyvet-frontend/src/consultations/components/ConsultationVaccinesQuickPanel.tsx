import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

// Paciente
import { fetchPatient } from '../../clinic/api';
import type { Patient } from '../../clinic/types';

// Vacunas
import { fetchVaccineApplications } from '../../vaccines/api';
import type {
  VaccineApplication,
  VaccineApplicationFilters,
  VaccineApplicationStatus,
  PaginatedResponse,
} from '../../vaccines/types';

type Props = {
  patientId: number | null;
  consultationId: number | null;
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  return value.slice(0, 10);
}

const STATUS_LABEL: Record<VaccineApplicationStatus, string> = {
  pendiente: 'Pendiente',
  aplicada: 'Aplicada',
  omitida: 'Omitida',
  vencida: 'Vencida',
};

export function ConsultationVaccinesQuickPanel({
  patientId,
  consultationId,
}: Props) {
  const { token } = useAuth();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [apps, setApps] = useState<VaccineApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar datos del paciente (nombre)
  useEffect(() => {
    async function loadPatient() {
      if (!token || !patientId) {
        setPatient(null);
        return;
      }

      try {
        const p = (await fetchPatient(token, patientId)) as Patient;
        setPatient(p);
      } catch (err) {
        console.error(
          'Error cargando paciente en panel vacunas:',
          err,
        );
      }
    }

    void loadPatient();
  }, [token, patientId]);

  // Cargar vacunas del paciente
  useEffect(() => {
    async function loadVaccines() {
      if (!token || !patientId) {
        setApps([]);
        setErrorMsg(null);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const filters: VaccineApplicationFilters = {
          patient_id: patientId,
          // IMPORTANTE: no mandamos status: 'all'
          page: 1,
          per_page: 10,
        };

        const res = (await fetchVaccineApplications(
          token,
          filters,
        )) as PaginatedResponse<VaccineApplication>;

        const data = Array.isArray(res.data) ? res.data : [];
        setApps(data);

        console.log(
          '[QuickPanel vacunas] patient_id =',
          patientId,
          'resultado:',
          data,
        );
      } catch (err: any) {
        console.error(
          'Error cargando vacunas en panel rápido de consulta:',
          err,
        );
        setErrorMsg(
          err?.message ||
            'No se pudieron cargar las vacunas de este paciente.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadVaccines();
  }, [token, patientId, consultationId]);

  if (!patientId) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          Vacunas y recordatorios del paciente
        </h3>
        <p className="mt-1 text-slate-600">
          Selecciona un paciente en la consulta para ver aquí sus vacunas
          aplicadas y pendientes. Así podrás decidir si corresponde aplicar
          una nueva dosis o programar un refuerzo.
        </p>
      </section>
    );
  }

  const patientName = patient?.name ?? `Paciente #${patientId}`;

  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Vacunas y recordatorios del paciente
          </h3>
          <p className="mt-1 text-slate-600">
            Registra y revisa las vacunas aplicadas o pendientes de{' '}
            <span className="font-semibold">{patientName}</span>. Esta
            información se sincroniza con la agenda general de vacunas.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <Link
          to={
            consultationId
              ? `/dashboard/vacunas/nueva?patient_id=${patientId}&consultation_id=${consultationId}`
              : `/dashboard/vacunas/nueva?patient_id=${patientId}`
          }
          className="inline-flex items-center rounded-2xl bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          Registrar vacunación para este paciente
        </Link>

        <Link
          to={`/dashboard/vacunas?patient_id=${patientId}`}
          className="inline-flex items-center rounded-2xl border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
        >
          Ver agenda completa
        </Link>
      </div>

      {loading && (
        <p className="text-[11px] text-slate-500">
          Cargando vacunas de este paciente…
        </p>
      )}

      {errorMsg && !loading && (
        <p className="text-[11px] text-rose-600">{errorMsg}</p>
      )}

      {!loading && !errorMsg && (
        <>
          {apps.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              Este paciente aún no tiene vacunas registradas en el sistema.
              Puedes registrar la primera usando el botón “Registrar
              vacunación”.
            </p>
          ) : (
            <div className="border-t border-slate-100 pt-2">
              <p className="mb-1 text-[11px] font-semibold text-slate-700">
                Últimas vacunas registradas ({apps.length})
              </p>
              <div className="-mx-2 overflow-x-auto">
                <table className="min-w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-2 py-1 text-left font-medium text-slate-500">
                        Fecha
                      </th>
                      <th className="px-2 py-1 text-left font-medium text-slate-500">
                        Vacuna
                      </th>
                      <th className="px-2 py-1 text-left font-medium text-slate-500">
                        Próx. refuerzo
                      </th>
                      <th className="px-2 py-1 text-left font-medium text-slate-500">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map(a => {
                      const fecha = formatDate(a.planned_date);
                      const refuerzo = formatDate(a.next_due_date);
                      const vacuna = a.vaccine?.name || '—';
                      const estado = a.status as VaccineApplicationStatus;

                      return (
                        <tr
                          key={a.id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-2 py-1 text-slate-700">
                            {fecha}
                          </td>
                          <td className="px-2 py-1 text-slate-700">
                            {vacuna}
                          </td>
                          <td className="px-2 py-1 text-slate-700">
                            {refuerzo}
                          </td>
                          <td className="px-2 py-1">
                            <span
                              className={
                                estado === 'pendiente'
                                  ? 'inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700'
                                  : estado === 'aplicada'
                                  ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700'
                                  : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600'
                              }
                            >
                              {STATUS_LABEL[estado] ?? estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
