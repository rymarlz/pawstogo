// src/clinic/components/PatientClinicalSummary.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';

// Vacunas
import {
  fetchVaccineApplications,
} from '../../vaccines/api';
import type {
  VaccineApplication,
  VaccineApplicationFilters,
  PaginatedResponse as VaccinePaginatedResponse,
} from '../../vaccines/types';

// Consultas
import { fetchConsultations } from '../../consultations/api';
import type {
  Consultation,
  ConsultationFilters,
  PaginatedResponse as ConsultationPaginatedResponse,
} from '../../consultations/types';

type Props = {
  patientId: number;
};

type Summary = {
  nextVaccineDate: string | null;
  lastVaccineDate: string | null;
  lastConsultationDate: string | null;
  lastConsultationReason: string | null;
  totalVaccines: number;
  totalConsultations: number;
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = parseDate(value);
  if (!d) {
    return value.includes('T') ? value.split('T')[0] : value;
  }
  return d.toLocaleDateString('es-CL');
}

export function PatientClinicalSummary({ patientId }: Props) {
  const { token } = useAuth();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) {
        setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorBanner(null);

        // =====================
        // Vacunas del paciente
        // =====================
        const vacFilters: VaccineApplicationFilters = {
          patient_id: patientId,
          page: 1,
          per_page: 200, // suficiente para histórico reciente
        };

        const vacRes =
          (await fetchVaccineApplications(
            token,
            vacFilters,
          )) as VaccinePaginatedResponse<VaccineApplication>;

        const vacApps: VaccineApplication[] = Array.isArray(vacRes.data)
          ? vacRes.data
          : [];

        // =====================
        // Consultas del paciente
        // =====================
        const consFilters: ConsultationFilters = {
          patient_id: patientId,
          page: 1,
          per_page: 200,
        };

        const consRes =
          (await fetchConsultations(
            token,
            consFilters,
          )) as ConsultationPaginatedResponse<Consultation>;

        const consultations: Consultation[] = Array.isArray(consRes.data)
          ? consRes.data
          : [];

        // =====================
        // Cálculos de resumen
        // =====================

        // Próxima vacuna programada (planned_date futura más cercana)
        const now = new Date();
        const futureVaccines = vacApps
          .map(a => a as any)
          .filter((a: any) => {
            const d = parseDate(a.planned_date);
            return d && d >= now;
          })
          .sort((a: any, b: any) => {
            const da = parseDate(a.planned_date)!;
            const db = parseDate(b.planned_date)!;
            return da.getTime() - db.getTime();
          });

        const nextVaccineDate =
          futureVaccines.length > 0
            ? (futureVaccines[0].planned_date as string | null)
            : null;

        // Última vacuna aplicada (applied_at más reciente),
        // si no hay, usamos planned_date más reciente.
        const appliedVaccines = vacApps
          .map(a => a as any)
          .filter((a: any) => parseDate(a.applied_at))
          .sort((a: any, b: any) => {
            const da = parseDate(a.applied_at)!;
            const db = parseDate(b.applied_at)!;
            return db.getTime() - da.getTime();
          });

        let lastVaccineDate: string | null = null;

        if (appliedVaccines.length > 0) {
          lastVaccineDate = appliedVaccines[0].applied_at as
            | string
            | null;
        } else {
          const plannedSorted = vacApps
            .map(a => a as any)
            .filter((a: any) => parseDate(a.planned_date))
            .sort((a: any, b: any) => {
              const da = parseDate(a.planned_date)!;
              const db = parseDate(b.planned_date)!;
              return db.getTime() - da.getTime();
            });

          lastVaccineDate =
            plannedSorted.length > 0
              ? (plannedSorted[0].planned_date as string | null)
              : null;
        }

        // Última consulta
        const consultationsSorted = consultations
          .map(c => c as any)
          .filter((c: any) => {
            const d =
              parseDate(c.date) ||
              parseDate(c.fecha) ||
              parseDate(c.performed_at) ||
              parseDate(c.created_at);
            return !!d;
          })
          .sort((a: any, b: any) => {
            const da =
              parseDate(a.date) ||
              parseDate(a.fecha) ||
              parseDate(a.performed_at) ||
              parseDate(a.created_at)!;
            const db =
              parseDate(b.date) ||
              parseDate(b.fecha) ||
              parseDate(b.performed_at) ||
              parseDate(b.created_at)!;
            return db.getTime() - da.getTime();
          });

        let lastConsultationDate: string | null = null;
        let lastConsultationReason: string | null = null;

        if (consultationsSorted.length > 0) {
          const last = consultationsSorted[0];
          lastConsultationDate =
            (last.date as string | null) ||
            (last.fecha as string | null) ||
            (last.performed_at as string | null) ||
            (last.created_at as string | null) ||
            null;

          lastConsultationReason =
            (last.reason as string | null) ||
            (last.motivo as string | null) ||
            (last.diagnosis as string | null) ||
            null;
        }

        setSummary({
          nextVaccineDate,
          lastVaccineDate,
          lastConsultationDate,
          lastConsultationReason,
          totalVaccines: vacRes.meta?.total ?? vacApps.length,
          totalConsultations: consRes.meta?.total ?? consultations.length,
        });
      } catch (err: any) {
        console.error('Error cargando resumen clínico del paciente:', err);
        setErrorBanner(
          err?.messageApi ||
            err?.response?.data?.message ||
            err?.message ||
            'No se pudo cargar el resumen clínico del paciente.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, patientId]);

  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Resumen clínico rápido
          </h3>
          <p className="text-xs text-slate-500">
            Vista general de vacunas y consultas recientes del paciente.
          </p>
        </div>
      </header>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Cargando resumen clínico…
        </div>
      )}

      {errorBanner && !loading && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorBanner}
        </div>
      )}

      {!loading && !errorBanner && summary && (
        <div className="grid gap-3 md:grid-cols-3">
          {/* Próxima vacuna */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-medium text-slate-600">
              Próxima vacuna programada
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {summary.nextVaccineDate
                ? formatDate(summary.nextVaccineDate)
                : 'Sin próxima vacuna registrada'}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Total de vacunas en el sistema:{' '}
              <span className="font-semibold">
                {summary.totalVaccines}
              </span>
            </p>
          </div>

          {/* Última vacuna */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-medium text-slate-600">
              Última vacuna registrada
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {summary.lastVaccineDate
                ? formatDate(summary.lastVaccineDate)
                : 'Sin vacunas previas registradas'}
            </p>
          </div>

          {/* Última consulta */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-medium text-slate-600">
              Última consulta
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {summary.lastConsultationDate
                ? formatDate(summary.lastConsultationDate)
                : 'Sin consultas registradas'}
            </p>
            {summary.lastConsultationReason && (
              <p className="mt-1 text-[11px] text-slate-500">
                Motivo / diagnóstico:{' '}
                <span className="font-medium">
                  {summary.lastConsultationReason}
                </span>
              </p>
            )}
            <p className="mt-1 text-[11px] text-slate-500">
              Total de consultas:{' '}
              <span className="font-semibold">
                {summary.totalConsultations}
              </span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
