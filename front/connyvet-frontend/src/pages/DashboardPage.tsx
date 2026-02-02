// src/pages/DashboardPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../auth/AuthContext';

// Consultas
import { fetchConsultations } from '../consultations/api';
import type {
  Consultation,
  ConsultationFilters,
  PaginatedResponse as ConsultationsPaginatedResponse,
} from '../consultations/types';

// Vacunas (agenda)
import { fetchVaccineApplications } from '../vaccines/api';
import type {
  VaccineApplication,
  VaccineApplicationFilters,
  PaginatedResponse as VaccinesPaginatedResponse,
} from '../vaccines/types';

// ===== Helpers de fecha =====
const todayLabel = new Date().toLocaleDateString('es-CL', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function getTodayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getIsoFromDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatHour(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(value?: string | null): string {
  if (!value) return '—';
  const parts = value.slice(0, 10).split('-');
  if (parts.length !== 3) return value.slice(0, 10);
  const [y, m, d] = parts;
  return `${d}-${m}-${y}`;
}

// ===== Módulos (solo los que realmente existen en tu layout/sidebar) =====
type ModuleCard = { title: string; description: string; to: string };

export function DashboardPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  // === Estado: citas de hoy ===
  const [todayConsultations, setTodayConsultations] = useState<Consultation[]>([]);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [todayError, setTodayError] = useState<string | null>(null);

  // === Estado: vacunas (próximas y vencidas) ===
  const [upcomingVaccines, setUpcomingVaccines] = useState<VaccineApplication[]>([]);
  const [upcomingTotal, setUpcomingTotal] = useState<number | null>(null);
  const [overdueTotal, setOverdueTotal] = useState<number | null>(null);
  const [vaccinesError, setVaccinesError] = useState<string | null>(null);

  // Carga única del dashboard (consultas + vacunas en paralelo)
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const userName = user?.name || 'Profesional';
  const isAdmin = (user?.role ?? '') === 'admin';

  // ✅ Módulos alineados con tus rutas del sidebar
  const clinicModules: ModuleCard[] = useMemo(
    () => [
      {
        title: 'Agenda y consultas',
        description: 'Citas programadas, controles y seguimiento clínico.',
        to: '/dashboard/consultas',
      },
      {
        title: 'Vacunas pendientes',
        description: 'Agenda de vacunas, refuerzos y estado (pendiente/aplicada).',
        to: '/dashboard/vacunas',
      },
    ],
    [],
  );

  const peopleModules: ModuleCard[] = useMemo(
    () => [
      {
        title: 'Pacientes',
        description: 'Listado de mascotas, especie, raza y estado.',
        to: '/dashboard/pacientes',
      },
      {
        title: 'Tutores',
        description: 'Datos de contacto, teléfonos y correo.',
        to: '/dashboard/tutores',
      },
    ],
    [],
  );

  const adminModules: ModuleCard[] = useMemo(() => {
    const base: ModuleCard[] = [
      {
        title: 'Pagos',
        description: 'Registro de pagos y seguimiento de deudas.',
        to: '/dashboard/pagos',
      },
      {
        title: 'Presupuestos',
        description: 'Creación, envío y descarga de PDF.',
        to: '/dashboard/presupuestos',
      },
    ];

    if (isAdmin) {
      base.push(
        {
          title: 'Catálogo de vacunas',
          description: 'Configurar vacunas, dosis por defecto e intervalos.',
          to: '/dashboard/catalogo-vacunas',
        },
        {
          title: 'Usuarios y roles',
          description: 'Cuentas internas, permisos y accesos.',
          to: '/dashboard/usuarios',
        },
      );
    }

    return base;
  }, [isAdmin]);

  // ===== Un solo efecto: cargar consultas de hoy y vacunas en paralelo =====
  useEffect(() => {
    if (!token) return;

    setLoadingDashboard(true);
    setTodayError(null);
    setVaccinesError(null);

    async function loadToday(): Promise<void> {
      try {
        const todayIso = getTodayIso();
        const filters: ConsultationFilters = {
          date_from: todayIso,
          date_to: todayIso,
          status: 'all',
          page: 1,
          per_page: 5,
        };
        const res = (await fetchConsultations(token!, filters)) as ConsultationsPaginatedResponse<Consultation>;
        const data = Array.isArray(res.data) ? res.data : [];
        setTodayConsultations(data);
        setTodayCount(res.meta?.total ?? data.length);
      } catch (err: unknown) {
        const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message?: string }).message) : 'No se pudieron cargar las citas de hoy.';
        setTodayError(msg);
      }
    }

    async function loadVaccines(): Promise<void> {
      try {
        const today = new Date();
        const todayIso = getIsoFromDate(today);
        const in7Iso = getIsoFromDate(addDays(today, 7));
        const yesterdayIso = getIsoFromDate(addDays(today, -1));

        const upcomingFilters: VaccineApplicationFilters = {
          status: 'pendiente',
          date_from: todayIso,
          date_to: in7Iso,
          page: 1,
          per_page: 5,
        };
        const upcomingRes = (await fetchVaccineApplications(token!, upcomingFilters)) as VaccinesPaginatedResponse<VaccineApplication>;
        const upcomingData = Array.isArray(upcomingRes.data) ? upcomingRes.data : [];
        setUpcomingVaccines(upcomingData);
        setUpcomingTotal(upcomingRes.meta?.total ?? upcomingData.length ?? 0);

        const overdueFilters: VaccineApplicationFilters = {
          status: 'pendiente',
          date_to: yesterdayIso,
          page: 1,
          per_page: 1,
        };
        const overdueRes = (await fetchVaccineApplications(token!, overdueFilters)) as VaccinesPaginatedResponse<VaccineApplication>;
        setOverdueTotal(overdueRes.meta?.total ?? 0);
      } catch (err: unknown) {
        const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message?: string }).message) : 'No se pudieron cargar las vacunas próximas.';
        setVaccinesError(msg);
      }
    }

    void Promise.all([loadToday(), loadVaccines()]).finally(() => setLoadingDashboard(false));
  }, [token]);

  const citasHoyLabel = todayCount != null ? String(todayCount) : '—';
  const vacunasProximasLabel = upcomingTotal != null ? String(upcomingTotal) : '—';
  const hayVencidas = (overdueTotal ?? 0) > 0;

  return (
    <DashboardLayout title="Resumen general">
      {/* Encabezado */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs text-slate-400">Hoy</p>
            <p className="text-sm text-slate-700">{todayLabel}</p>
            <p className="mt-1 text-xs text-slate-500">Hola, {userName}</p>

            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Acceso rápido a consultas, vacunas, pacientes, tutores, pagos, presupuestos y administración.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <p className="text-slate-500">Citas del día</p>
              <p className="text-lg font-semibold text-slate-900">{citasHoyLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <p className="text-slate-500">Vacunas próximas (7 días)</p>
              <p className="text-lg font-semibold text-slate-900">{vacunasProximasLabel}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Alertas de hoy */}
      <section className="mb-6">
        <div
          className="rounded-2xl border px-4 py-3 text-xs shadow-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--brand) 25%, #e5e7eb)',
            backgroundColor: 'color-mix(in srgb, var(--brand) 10%, white)',
          }}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--brand) 20%, white)',
                  color: 'var(--brand)',
                }}
              >
                ⏰
              </span>
              <div>
                <p className="font-semibold text-slate-900">Agenda de hoy</p>
                <p className="text-[11px] text-slate-600">
                  Próximas consultas. Úsalas como lista rápida de trabajo.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/dashboard/consultas')}
              className="hidden sm:inline-flex items-center rounded-xl border px-3 py-1.5 text-[11px] hover:bg-white"
              style={{
                borderColor: 'color-mix(in srgb, var(--brand) 35%, #e5e7eb)',
                color: 'var(--brand)',
                backgroundColor: 'transparent',
              }}
            >
              Ver todas
            </button>
          </div>

          {loadingDashboard && <p className="text-[11px] text-slate-700">Cargando citas…</p>}

          {todayError && !loadingDashboard && <p className="text-[11px] text-red-700">{todayError}</p>}

          {!loadingDashboard && !todayError && (
            <>
              {todayConsultations.length === 0 ? (
                <p className="text-[11px] text-slate-700">Hoy no hay citas registradas.</p>
              ) : (
                <ul className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--brand) 12%, #e5e7eb)' }}>
                  {todayConsultations.map(c => {
                    const hora = formatHour((c as any).date);
                    const paciente = c.patient?.name || `Paciente #${c.patient_id}`;
                    const motivo = c.reason || 'Sin motivo registrado';

                    return (
                      <li key={c.id} className="flex items-center justify-between py-1.5">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold text-slate-900">
                            {hora} · {paciente}
                          </span>
                          <span className="text-[11px] text-slate-600">{motivo}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/consultas/${c.id}`)}
                          className="inline-flex items-center rounded-xl border px-2 py-1 text-[11px] hover:bg-white"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--brand) 35%, #e5e7eb)',
                          
                          }}
                        >
                          Ver
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          <div className="mt-2 sm:hidden">
            <button
              type="button"
              onClick={() => navigate('/dashboard/consultas')}
              className="inline-flex items-center rounded-xl border px-3 py-1.5 text-[11px] hover:bg-white"
              style={{
                borderColor: 'color-mix(in srgb, var(--brand) 35%, #e5e7eb)',
                color: 'var(--brand)',
              }}
            >
              Ver todas
            </button>
          </div>
        </div>
      </section>

      {/* Vacunas */}
      <section className="mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-xs shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm"
                style={{
                  backgroundColor: 'var(--brand-soft)',
                  color: 'var(--brand)',
                }}
              >
                💉
              </span>
              <div>
                <p className="font-semibold text-slate-900">Vacunas y recordatorios</p>
                <p className="text-[11px] text-slate-600">
                  Próximas vacunas programadas y pendientes vencidas.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/dashboard/vacunas')}
              className="hidden sm:inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
            >
              Ver agenda
            </button>
          </div>

          {loadingDashboard && <p className="text-[11px] text-slate-700">Cargando vacunas…</p>}

          {vaccinesError && !loadingDashboard && <p className="text-[11px] text-red-700">{vaccinesError}</p>}

          {!loadingDashboard && !vaccinesError && (
            <>
              {upcomingVaccines.length === 0 && (overdueTotal ?? 0) === 0 ? (
                <p className="text-[11px] text-slate-700">
                  No hay vacunas pendientes para los próximos días ni vencidas.
                </p>
              ) : (
                <div className="space-y-2">
                  {hayVencidas && (
                    <p className="text-[11px] text-slate-800">
                      <span className="mr-1 inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700">
                        Atención
                      </span>
                      Hay <strong>{overdueTotal}</strong> vacuna(s) <strong>vencida(s)</strong>.
                    </p>
                  )}

                  {upcomingVaccines.length > 0 && (
                    <>
                      <p className="text-[11px] text-slate-700">
                        Próximas vacunas (7 días):
                      </p>
                      <ul className="divide-y divide-slate-100">
                        {upcomingVaccines.map(v => {
                          const anyV = v as any;
                          const fecha = formatDateShort(anyV.planned_date);
                          const paciente = anyV.patient?.name || `Paciente #${anyV.patient_id}`;
                          const tutor = (anyV.tutor as any)?.name || '';
                          const vacuna = anyV.vaccine?.name || 'Vacuna';

                          return (
                            <li key={anyV.id} className="flex items-center justify-between py-1.5">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-semibold text-slate-900">
                                  {fecha} · {paciente}
                                </span>
                                <span className="text-[11px] text-slate-600">
                                  {vacuna}{tutor ? ` · Tutor: ${tutor}` : ''}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/dashboard/vacunas/${anyV.id}`)}
                                className="inline-flex items-center rounded-xl border border-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                              >
                                Ver
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-2 sm:hidden">
            <button
              type="button"
              onClick={() => navigate('/dashboard/vacunas')}
              className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
            >
              Ver agenda
            </button>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <section className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Clínica</h2>
            <p className="text-xs text-slate-500">Agenda y vacunas.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clinicModules.map(m => (
              <Link
                key={m.title}
                to={m.to}
                className="group rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm transition-colors hover:bg-slate-50"
              >
                <p className="text-sm font-medium text-slate-900">{m.title}</p>
                <p className="mt-1 text-xs text-slate-600">{m.description}</p>
                <p className="mt-3 text-[11px]" style={{ color: 'var(--brand)' }}>
                  Ver módulo
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Pacientes y tutores</h2>
            <p className="text-xs text-slate-500">Registros y datos de contacto.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {peopleModules.map(m => (
              <Link
                key={m.title}
                to={m.to}
                className="group rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm transition-colors hover:bg-slate-50"
              >
                <p className="text-sm font-medium text-slate-900">{m.title}</p>
                <p className="mt-1 text-xs text-slate-600">{m.description}</p>
                <p className="mt-3 text-[11px]" style={{ color: 'var(--brand)' }}>
                  Ver módulo
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Administración</h2>
            <p className="text-xs text-slate-500">Pagos, presupuestos y configuración.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {adminModules.map(m => (
              <Link
                key={m.title}
                to={m.to}
                className="group rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-sm transition-colors hover:bg-slate-50"
              >
                <p className="text-sm font-medium text-slate-900">{m.title}</p>
                <p className="mt-1 text-xs text-slate-600">{m.description}</p>
                <p className="mt-3 text-[11px]" style={{ color: 'var(--brand)' }}>
                  Ver módulo
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
