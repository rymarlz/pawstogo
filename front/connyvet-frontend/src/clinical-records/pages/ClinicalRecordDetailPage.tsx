// src/clinical-records/pages/ClinicalRecordDetailPage.tsx
import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { fetchClinicalRecord } from '../api';

// =============================
// Tipos de la respuesta
// =============================
type ClinicalRecordPatient = {
  id: number;
  name: string | null;
  species: string | null;
  breed: string | null;
  sex: string | null;
  color: string | null;
  microchip: string | null;
  birth_date: string | null;
  active?: boolean;
  weight_kg?: number | null;
  sterilized?: boolean;
  notes?: string | null;
};

type ClinicalRecordTutor = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  rut?: string | null;
  direccion?: string | null;
  comuna?: string | null;
  region?: string | null;
};

type ClinicalRecordConsultation = {
  id: number;
  patient_id: number;
  tutor_id: number | null;
  doctor_id: number | null;
  date: string | null; // ISO
  visit_type: string | null;
  reason: string | null;
  anamnesis: string | null;
  physical_exam: string | null;
  diagnosis_primary: string | null;
  diagnosis_secondary: string | null;
  treatment: string | null;
  recommendations: string | null;
  weight_kg: number | null;
  temperature_c: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  body_condition_score: number | null;
  next_control_date: string | null;
  status: string | null;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
  doctor?: {
    id: number;
    name: string;
    email: string;
  } | null;
};

type ClinicalRecordVaccineApplication = {
  id: number;
  patient_id: number;
  tutor_id: number | null;
  vaccine_id: number | null;
  consultation_id: number | null;
  doctor_id: number | null;

  vaccine_name: string | null;
  status: string | null;

  planned_date: string | null;   // yyyy-mm-dd
  applied_at: string | null;     // ISO
  applied_date?: string | null;  // yyyy-mm-dd (compat backend)

  dose_number?: number | null;

  created_at: string | null;
  updated_at: string | null;

  vaccine?: {
    id: number;
    name: string;
    species: string | null;
  } | null;
};

type ClinicalRecordHospitalization = {
  id: number;
  patient_id: number;
  tutor_id: number | null;
  admission_date: string | null;
  discharge_date: string | null;
  status: string | null;
  bed_number: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ClinicalRecordResponse = {
  patient: ClinicalRecordPatient;
  tutor: ClinicalRecordTutor | null;
  consultations: ClinicalRecordConsultation[];
  vaccine_applications: ClinicalRecordVaccineApplication[];
  hospitalizations: ClinicalRecordHospitalization[];
};

function formatShortDate(value?: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('es-CL');
  } catch {
    return value;
  }
}

// =============================
// Página
// =============================
export function ClinicalRecordDetailPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ patientId: string }>();

  const patientId = params.patientId ? Number(params.patientId) : NaN;

  const [record, setRecord] = useState<ClinicalRecordResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const patient = record?.patient || null;
  const tutor = record?.tutor || null;

  const consultations = useMemo(
    () => record?.consultations ?? [],
    [record],
  );

  const vaccines = useMemo(
    () => record?.vaccine_applications ?? [],
    [record],
  );

  const hospitalizations = useMemo(
    () => record?.hospitalizations ?? [],
    [record],
  );

  useEffect(() => {
    // si el id es inválido, volvemos a pacientes
    if (!patientId || Number.isNaN(patientId)) {
      navigate('/dashboard/pacientes', { replace: true });
      return;
    }

    async function load() {
      if (!token) {
        setError('Sesión no válida. Vuelve a iniciar sesión.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetchClinicalRecord(token as string, patientId);
        // soporta back que devuelva { data: {...} } o directo
        const data: ClinicalRecordResponse = (res as any).data ?? res;
        setRecord(data);
      } catch (err: any) {
        console.error('Error cargando ficha clínica:', err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'No se pudo cargar la ficha clínica del paciente.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, patientId, navigate]);

  function handleGoBack() {
    navigate(-1);
  }

  function handleGoToPatient() {
    if (!patient?.id) return;
    navigate(`/dashboard/pacientes/${patient.id}`);
  }

  function handleEditPatient() {
    if (!patient?.id) return;
    navigate(`/dashboard/pacientes/${patient.id}/editar`);
  }

  function handleNewConsultation() {
    if (!patient?.id) return;
    const params = new URLSearchParams();
    params.set('patient_id', String(patient.id));
    if ((tutor as any)?.id) {
      params.set('tutor_id', String((tutor as any).id));
    }
    navigate(`/dashboard/consultas/nueva?${params.toString()}`);
  }

  function handleNewVaccineApplication() {
    if (!patient?.id) return;
    const params = new URLSearchParams();
    params.set('patient_id', String(patient.id));
    if ((tutor as any)?.id) {
      params.set('tutor_id', String((tutor as any).id));
    }
    navigate(`/dashboard/vacunas/nueva?${params.toString()}`);
  }

  function handleNewPayment() {
    if (!patient?.id) return;
    const params = new URLSearchParams();
    params.set('patient_id', String(patient.id));
    if ((tutor as any)?.id) {
      params.set('tutor_id', String((tutor as any).id));
    }
    navigate(`/dashboard/pagos/nuevo?${params.toString()}`);
  }

  function handleGoToVaccinesAgenda() {
    if (!patient?.id) return;
    navigate(`/dashboard/vacunas?patient_id=${patient.id}`);
  }

  return (
    <DashboardLayout title="Ficha clínica del paciente">
      {/* Encabezado */}
      <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Ficha clínica
          </p>
          <h1 className="text-lg font-semibold text-slate-900">
            {patient?.name
              ? `${patient.name} · Ficha clínica completa`
              : patient
              ? `Paciente #${patient.id}`
              : 'Paciente'}
          </h1>

          {patient && (
            <p className="mt-1 text-xs text-slate-500">
              Especie:{' '}
              <span className="font-medium">
                {patient.species || '—'}
              </span>{' '}
              · Raza:{' '}
              <span className="font-medium">
                {patient.breed || '—'}
              </span>{' '}
              · Sexo:{' '}
              <span className="font-medium">
                {patient.sex || '—'}
              </span>
            </p>
          )}

          {tutor && (
            <p className="mt-1 text-xs text-slate-500">
              Tutor:{' '}
              <span className="font-medium">
                {tutor.name}
              </span>
              {tutor.email && (
                <>
                  {' '}
                  ·{' '}
                  <span className="text-slate-600">
                    {tutor.email}
                  </span>
                </>
              )}
              {tutor.phone && (
                <>
                  {' '}
                  · Tel:{' '}
                  <span className="text-slate-600">
                    {tutor.phone}
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center rounded-2xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
          >
            Volver
          </button>
          {patient && (
            <button
              type="button"
              onClick={handleGoToPatient}
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
            >
              Ver ficha básica del paciente
            </button>
          )}
          {patient && (
            <button
              type="button"
              onClick={handleEditPatient}
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
            >
              Editar paciente
            </button>
          )}
          {patient && (
            <button
              type="button"
              onClick={handleNewConsultation}
              className="inline-flex items-center rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
            >
              Nueva consulta
            </button>
          )}
          {patient && (
            <button
              type="button"
              onClick={handleNewVaccineApplication}
              className="inline-flex items-center rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
            >
              Programar / registrar vacuna
            </button>
          )}
          {patient && (
            <button
              type="button"
              onClick={handleNewPayment}
              className="inline-flex items-center rounded-2xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              Crear pago asociado
            </button>
          )}
        </div>
      </section>

      {/* Estado de carga / error */}
      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-xs text-slate-500">
          Cargando ficha clínica del paciente…
        </p>
      )}

      {/* Contenido principal */}
      {!loading && !error && record && (
        <div className="space-y-6 text-xs">
          {/* Resumen rápido */}
          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Información general
              </p>
              <dl className="mt-2 space-y-1.5">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Fecha de nacimiento</dt>
                  <dd className="font-medium text-slate-800">
                    {formatShortDate(patient?.birth_date ?? null)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Color</dt>
                  <dd className="font-medium text-slate-800">
                    {patient?.color || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Microchip</dt>
                  <dd className="font-medium text-slate-800">
                    {patient?.microchip || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Esterilizado</dt>
                  <dd className="font-medium text-slate-800">
                    {patient?.sterilized ? 'Sí' : 'No / N/D'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Parámetros recientes
              </p>
              <dl className="mt-2 space-y-1.5">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Peso (kg)</dt>
                  <dd className="font-medium text-slate-800">
                    {patient?.weight_kg ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Estado activo</dt>
                  <dd className="font-medium text-slate-800">
                    {patient?.active ? 'Activo' : 'Inactivo'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700">
                Resumen rápido
              </p>
              <ul className="mt-2 space-y-1.5 text-[11px] text-slate-700">
                <li>
                  Consultas registradas:{' '}
                  <span className="font-semibold">
                    {consultations.length}
                  </span>
                </li>
                <li>
                  Vacunas registradas:{' '}
                  <span className="font-semibold">
                    {vaccines.length}
                  </span>
                </li>
                <li>
                  Hospitalizaciones:{' '}
                  <span className="font-semibold">
                    {hospitalizations.length}
                  </span>
                </li>
              </ul>
            </div>
          </section>

          {/* Notas del paciente */}
          {patient?.notes && (
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-slate-800">
                Notas del paciente
              </h2>
              <p className="whitespace-pre-line text-[11px] text-slate-600">
                {patient.notes}
              </p>
            </section>
          )}

          {/* Consultas + Vacunas + Hospitalizaciones */}
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* Consultas */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Consultas médicas
                </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {consultations.length} registro
                  {consultations.length === 1 ? '' : 's'}
                </span>
              </div>

              {consultations.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  No hay consultas registradas para este paciente.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-3 py-2 text-left font-medium text-slate-500">
                          Fecha
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">
                          Motivo
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">
                          Diagnóstico
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-slate-500">
                          Médico
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-slate-500">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {consultations.map((c, idx) => {
                        const bg =
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                        return (
                          <tr
                            key={c.id}
                            className={`${bg} border-b border-slate-100`}
                          >
                            <td className="px-3 py-2 align-top text-slate-700">
                              {formatShortDate(c.date)}
                            </td>
                            <td className="px-3 py-2 align-top text-slate-800">
                              {c.reason || '—'}
                            </td>
                            <td className="px-3 py-2 align-top text-slate-700">
                              {c.diagnosis_primary || '—'}
                            </td>
                            <td className="px-3 py-2 align-top text-slate-700">
                              {c.doctor?.name || '—'}
                            </td>
                            <td className="px-3 py-2 align-top text-right">
                              <Link
                                to={`/dashboard/consultas/${c.id}`}
                                className="rounded-xl border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                              >
                                Ver / editar
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Columna derecha: Vacunas + Hospitalizaciones */}
            <div className="space-y-3">
              {/* Vacunas */}
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Vacunas
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                      {vaccines.length} registro
                      {vaccines.length === 1 ? '' : 's'}
                    </span>
                    {vaccines.length > 0 && (
                      <button
                        type="button"
                        onClick={handleGoToVaccinesAgenda}
                        className="rounded-xl border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800 hover:bg-emerald-100"
                      >
                        Ver en agenda
                      </button>
                    )}
                  </div>
                </div>

                {vaccines.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    No hay vacunas registradas para este paciente.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {vaccines.map(v => {
                      const applied =
                        !!v.applied_at || v.status === 'aplicada';
                      const planned =
                        !applied && !!v.planned_date;

                      const dateLabel = applied
                        ? `Aplicada: ${formatShortDate(
                            v.applied_date || v.applied_at,
                          )}`
                        : planned
                        ? `Programada: ${formatShortDate(
                            v.planned_date,
                          )}`
                        : 'Sin fecha';

                      return (
                        <li
                          key={v.id}
                          className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5"
                        >
                          <div>
                            <p className="text-[11px] font-semibold text-slate-800">
                              {v.vaccine_name ||
                                v.vaccine?.name ||
                                'Vacuna'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {dateLabel}
                            </p>
                            {v.status && (
                              <p className="text-[11px] text-slate-500">
                                Estado:{' '}
                                <span className="font-medium">
                                  {v.status}
                                </span>
                              </p>
                            )}
                          </div>
                          <span
                            className={
                              applied
                                ? 'mt-0.5 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700'
                                : 'mt-0.5 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700'
                            }
                          >
                            {applied ? 'Aplicada' : 'Pendiente'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Hospitalizaciones */}
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Hospitalizaciones
                  </h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                    {hospitalizations.length} registro
                    {hospitalizations.length === 1 ? '' : 's'}
                  </span>
                </div>

                {hospitalizations.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    No hay hospitalizaciones registradas para este paciente.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {hospitalizations.map(h => (
                      <li
                        key={h.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700"
                      >
                        <p>
                          Ingreso:{' '}
                          <span className="font-medium">
                            {formatShortDate(h.admission_date)}
                          </span>
                          {h.discharge_date && (
                            <>
                              {' '}
                              · Alta:{' '}
                              <span className="font-medium">
                                {formatShortDate(h.discharge_date)}
                              </span>
                            </>
                          )}
                        </p>
                        <p>
                          Estado:{' '}
                          <span className="font-medium">
                            {h.status || '—'}
                          </span>
                          {h.bed_number && (
                            <>
                              {' '}
                              · Cama:{' '}
                              <span className="font-medium">
                                {h.bed_number}
                              </span>
                            </>
                          )}
                        </p>
                        {h.notes && (
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {h.notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
