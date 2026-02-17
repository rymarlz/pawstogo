// src/clinic/pages/PatientDetailPage.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { apiFetch } from '../../api';
import type { Patient } from '../types';
import { sexDisplay, speciesDisplay, LABELS_CLINICAL } from '../../lib/labels';

// Helpers de formato
function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export function PatientDetailPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const id = params.id ? Number(params.id) : NaN;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!id || Number.isNaN(id)) {
      navigate('/dashboard/pacientes');
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/patients/${id}`, {
          method: 'GET',
          token,
        });

        const p: Patient = (res as any).data ?? res;
        setPatient(p);
      } catch (err: any) {
        console.error('Error cargando paciente:', err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'No se pudo cargar la información del paciente.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, id, navigate]);

  const tutorName =
    (patient as any)?.tutor?.name ||
    (patient as any)?.tutor_name ||
    null;

  const tutorEmail =
    (patient as any)?.tutor?.email ||
    (patient as any)?.tutor_email ||
    null;

  const tutorPhone =
    (patient as any)?.tutor?.phone ||
    (patient as any)?.tutor_phone ||
    null;

  const tutorAddress = (patient as any)?.tutor?.address ?? null;
  const fileNumber = (patient as any)?.file_number ?? patient?.id;

  function handleGoBack() {
    navigate(-1);
  }

  // ✅ usar la ruta real de la ficha clínica
  function handleGoToClinicalRecord() {
    if (!patient?.id) return;
    navigate(`/dashboard/fichas/${patient.id}`);
  }

  function handleNewConsultation() {
    if (!patient?.id) return;
    const params = new URLSearchParams();
    params.set('patient_id', String(patient.id));
    if ((patient as any).tutor_id) {
      params.set('tutor_id', String((patient as any).tutor_id));
    }
    navigate(`/dashboard/consultas/nueva?${params.toString()}`);
  }

  // ✅ usar la ruta correcta para agendar vacuna
  function handleNewVaccineApplication() {
    if (!patient?.id) return;
    const params = new URLSearchParams();
    params.set('patient_id', String(patient.id));
    if ((patient as any).tutor_id) {
      params.set('tutor_id', String((patient as any).tutor_id));
    }
    navigate(`/dashboard/vacunas/nueva?${params.toString()}`);
  }

  function handleNewPayment() {
    if (!patient?.id) return;
    const params = new URLSearchParams();
    params.set('patient_id', String(patient.id));
    if ((patient as any).tutor_id) {
      params.set('tutor_id', String((patient as any).tutor_id));
    }
    navigate(`/dashboard/pagos/nuevo?${params.toString()}`);
  }

  const photoUrl: string | null =
    (patient as Patient & { photo_url?: string | null })?.photo_url ?? null;
  const initial =
    patient?.name ? patient.name.charAt(0).toUpperCase() : '?';

  return (
    <DashboardLayout title="Detalle del paciente">
      {/* Encabezado */}
      <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-wrap items-start gap-4">
          {/* Imagen del paciente (la misma que en el listado) */}
          <div className="shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={patient?.name ?? 'Paciente'}
                className="h-24 w-24 rounded-2xl object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-100 text-2xl font-semibold text-slate-400">
                {initial}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Pacientes
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              {patient?.name
                ? patient.name
                : patient
                ? `Paciente #${patient.id}`
                : 'Paciente'}
            </h1>

          {patient && (
            <p className="mt-1 text-xs text-slate-500">
              N.º de ficha:{' '}
              <span className="font-medium">{fileNumber ?? patient.id}</span>
              {' · '}
              {LABELS_CLINICAL.species}:{' '}
              <span className="font-medium">
                {speciesDisplay((patient as any).species, (patient as any).species_display)}
              </span>{' '}
              · Raza:{' '}
              <span className="font-medium">
                {(patient as any).breed || '—'}
              </span>{' '}
              · Sexo:{' '}
              <span className="font-medium">
                {sexDisplay((patient as any).sex)}
              </span>
            </p>
          )}

          {tutorName && (
            <p className="mt-1 text-xs text-slate-500">
              Tutor:{' '}
              <span className="font-medium">{tutorName}</span>
              {tutorEmail && (
                <>
                  {' '}
                  · <span className="text-slate-600">{tutorEmail}</span>
                </>
              )}
              {tutorPhone && (
                <>
                  {' '}
                  · Tel: <span className="text-slate-600">{tutorPhone}</span>
                </>
              )}
              {tutorAddress && tutorAddress !== 'No disponible' && (
                <>
                  {' '}
                  · Dirección: <span className="text-slate-600">{tutorAddress}</span>
                </>
              )}
            </p>
          )}
          </div>
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
            <Link
              to={`/dashboard/pacientes/${patient.id}/editar`}
              className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
            >
              Editar paciente
            </Link>
          )}
          {patient && (
            <button
              type="button"
              onClick={handleGoToClinicalRecord}
              className="inline-flex items-center rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
            >
              Ver ficha clínica completa
            </button>
          )}
        </div>
      </section>

      {/* Contexto mascota: Citas / Vacunas / Ficha clínica solo de esta mascota */}
      {!loading && !error && patient && (
        <section className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-2">
            Ver solo esta mascota
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/dashboard/consultas?patient_id=${patient.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-50"
            >
              Citas
            </Link>
            <Link
              to={`/dashboard/vacunas?patient_id=${patient.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50"
            >
              Vacunas
            </Link>
            <Link
              to={`/dashboard/fichas/${patient.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
            >
              Ficha clínica
            </Link>
          </div>
        </section>
      )}

      {/* Estado de carga / error */}
      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-xs text-slate-500">
          Cargando información del paciente…
        </p>
      )}

      {!loading && !error && patient && (
        <div className="space-y-6 text-xs">
          {/* Bloque de info básica */}
          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                Información general
              </p>
              <dl className="mt-2 space-y-1.5">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Fecha de nacimiento</dt>
                  <dd className="font-medium text-slate-800">
                    {formatDate((patient as any).birth_date ?? null)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Color</dt>
                  <dd className="font-medium text-slate-800">
                    {(patient as any).color || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Microchip</dt>
                  <dd className="font-medium text-slate-800">
                    {(patient as any).microchip || '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Esterilizado</dt>
                  <dd className="font-medium text-slate-800">
                    {(patient as any).sterilized ? 'Sí' : 'No / N/D'}
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
                    {(patient as any).weight_kg ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Estado activo</dt>
                  <dd className="font-medium text-slate-800">
                    {patient.active ? 'Activo' : 'Inactivo'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 shadow-sm">
              <p className="text-[11px] uppercase tracking-wide text-emerald-700">
                Acciones rápidas
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleNewConsultation}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  Nueva consulta para este paciente
                </button>
                <button
                  type="button"
                  onClick={handleNewVaccineApplication}
                  className="rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-[11px] text-emerald-900 hover:bg-emerald-200/80"
                >
                  Registrar / programar vacuna
                </button>
                <button
                  type="button"
                  onClick={handleNewPayment}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900 hover:bg-amber-100"
                >
                  Crear pago asociado
                </button>
                <button
                  type="button"
                  onClick={handleGoToClinicalRecord}
                  className="rounded-xl border border-slate-300 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-50 hover:bg-slate-800"
                >
                  Ver ficha clínica completa
                </button>
              </div>
            </div>
          </section>

          {(patient as any).notes && (
            <section className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-slate-800">
                Notas del paciente
              </h2>
              <p className="whitespace-pre-line text-[11px] text-slate-600">
                {(patient as any).notes}
              </p>
            </section>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
