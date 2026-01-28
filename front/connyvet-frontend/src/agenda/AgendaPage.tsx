// src/agenda/AgendaPage.tsx
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api';

import { fetchConsultations, updateConsultation } from '../consultations/api';

import type {
  Consultation,
  ConsultationFilters,
  ConsultationStatus,
  ConsultationUpsertPayload,
  PaginatedResponse as ConsultationsPaginatedResponse,
} from '../consultations/types';

// ==== Tipos locales ====

type AgendaViewMode = 'day' | 'week';

type AgendaStatusFilter = 'all' | 'open' | 'closed' | 'pending' | 'cancelled';

interface DoctorOption {
  id: number;
  name: string;
}

// ==== Helpers de fecha ====

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateHuman(d: Date): string {
  return d.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = domingo, 1 = lunes...
  const diff = (day + 6) % 7; // lunes como inicio
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatHour(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Mapea status interno a label humano
function statusLabel(status?: string | null): string {
  if (!status) return '—';
  const s = status.toLowerCase();
  if (s === 'abierta' || s === 'open') return 'Abierta';
  if (s === 'cerrada' || s === 'closed') return 'Cerrada';
  if (s === 'anulada' || s === 'cancelled') return 'Anulada';
  if (s === 'pendiente' || s === 'pending') return 'Pendiente';
  return status;
}

function statusPillClasses(status?: string | null): string {
  if (!status) {
    return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600';
  }

  const s = status.toLowerCase();

  if (s === 'abierta' || s === 'open') {
    return 'inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700';
  }

  if (s === 'cerrada' || s === 'closed') {
    return 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700';
  }

  if (s === 'anulada' || s === 'cancelled') {
    return 'inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700';
  }

  if (s === 'pendiente' || s === 'pending') {
    return 'inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700';
  }

  return 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600';
}

// ==== Componente principal ====

export function AgendaPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<AgendaViewMode>('day');
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [statusFilter, setStatusFilter] = useState<AgendaStatusFilter>('all');
  const [doctorIdFilter, setDoctorIdFilter] = useState<string>('all');
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Rango de fechas según vista
  const { dateFromISO, dateToISO, rangeLabel } = useMemo(() => {
    if (viewMode === 'day') {
      const iso = toISODate(selectedDate);
      return {
        dateFromISO: iso,
        dateToISO: iso,
        rangeLabel: formatDateHuman(selectedDate),
      };
    }

    const start = startOfWeek(selectedDate);
    const end = addDays(start, 6);
    return {
      dateFromISO: toISODate(start),
      dateToISO: toISODate(end),
      rangeLabel: `${formatDateHuman(start)} – ${formatDateHuman(end)}`,
    };
  }, [selectedDate, viewMode]);

  // Cargar doctores (para filtro) – solo si hay token
  useEffect(() => {
    if (!token) return;

    async function loadDoctors() {
      try {
        const res: any = await apiFetch('/admin/users?role=doctor&per_page=100', {
          token,
        });

        const raw = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.items)
            ? res.items
            : [];

        const mapped: DoctorOption[] = raw.map((u: any) => ({
          id: u.id,
          name: u.name || u.email || `Doctor #${u.id}`,
        }));

        setDoctors(mapped);
      } catch (err) {
        console.error('Error cargando doctores para filtro:', err);
      }
    }

    if (user?.role === 'admin' || user?.role === 'doctor') {
      void loadDoctors();
    }
  }, [token, user?.role]);

  // Cargar datos de agenda
  useEffect(() => {
    async function load() {
      if (!token) return;

      setLoading(true);
      setError(null);

      try {
        let mappedStatus: ConsultationFilters['status'];

        if (statusFilter === 'all') {
          mappedStatus = 'all';
        } else if (statusFilter === 'open') {
          mappedStatus = 'abierta' as ConsultationStatus;
        } else if (statusFilter === 'closed') {
          mappedStatus = 'cerrada' as ConsultationStatus;
        } else if (statusFilter === 'pending') {
          mappedStatus = 'pendiente' as ConsultationStatus;
        } else if (statusFilter === 'cancelled') {
          mappedStatus = 'anulada' as ConsultationStatus;
        } else {
          mappedStatus = undefined;
        }

        const filters: ConsultationFilters = {
          date_from: dateFromISO,
          date_to: dateToISO,
          status: mappedStatus,
          search: search || undefined,
          page: 1,
          per_page: 200,
        };

        if (doctorIdFilter !== 'all') {
          (filters as any).doctor_id = Number(doctorIdFilter);
        }

        const res = (await fetchConsultations(token, filters)) as
          | ConsultationsPaginatedResponse<Consultation>
          | any;

        const data = Array.isArray(res?.data) ? res.data : [];
        setConsultations(data);
        setTotal(res?.meta?.total ?? data.length ?? 0);
      } catch (err: any) {
        console.error('Error cargando agenda:', err);
        setError(err?.message || 'No se pudo cargar la agenda.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, dateFromISO, dateToISO, statusFilter, search, doctorIdFilter]);

  function goToToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  }

  function shiftPeriod(delta: number) {
    if (viewMode === 'day') {
      setSelectedDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + delta);
        return d;
      });
    } else {
      setSelectedDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + delta * 7);
        return d;
      });
    }
  }

  function handleNewConsultation() {
    const isoDate = toISODate(selectedDate);
    navigate(`/dashboard/consultas/nueva?date=${isoDate}`);
  }

  async function handleChangeStatus(c: Consultation, newStatus: ConsultationStatus) {
    if (!token) return;
    setUpdatingId(c.id);

    try {
      // ✅ update parcial: solo status
      const payload: Partial<ConsultationUpsertPayload> = {
        status: newStatus,
      };

      const res = await updateConsultation(token, c.id, payload as any);
      const updated: Consultation = (res as any)?.data ?? (res as any);

      setConsultations(prev =>
        prev.map(item => (item.id === c.id ? { ...item, ...updated } : item)),
      );
    } catch (err) {
      console.error('Error actualizando estado de consulta:', err);
    } finally {
      setUpdatingId(null);
    }
  }

  function handleCreatePaymentFromConsultation(c: Consultation) {
    const anyC: any = c;
    const patientId = anyC.patient_id;
    const tutorId = anyC.tutor_id;

    const searchParams = new URLSearchParams();
    if (patientId) searchParams.set('patient_id', String(patientId));
    if (tutorId) searchParams.set('tutor_id', String(tutorId));
    if (c.id) searchParams.set('source_consultation_id', String(c.id));

    navigate(`/dashboard/pagos/nuevo?${searchParams.toString()}`);
  }

  // === Agrupaciones para render ===

  const dayHours = useMemo(() => {
    const hours: number[] = [];
    for (let h = 8; h <= 21; h += 1) {
      hours.push(h);
    }
    return hours;
  }, []);

  const consultationsByHour = useMemo(() => {
    if (viewMode !== 'day') return {};
    const map: Record<number, Consultation[]> = {};
    for (const c of consultations) {
      const d = parseDate((c as any).date);
      if (!d) continue;
      if (!sameDay(d, selectedDate)) continue;
      const h = d.getHours();
      if (!map[h]) map[h] = [];
      map[h].push(c);
    }
    return map;
  }, [consultations, selectedDate, viewMode]);

  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];
    const start = startOfWeek(selectedDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      days.push(addDays(start, i));
    }
    return days;
  }, [selectedDate, viewMode]);

  const consultationsByDay = useMemo(() => {
    if (viewMode !== 'week') return {};
    const map: Record<string, Consultation[]> = {};
    for (const day of weekDays) {
      map[toISODate(day)] = [];
    }
    for (const c of consultations) {
      const d = parseDate((c as any).date);
      if (!d) continue;
      const iso = toISODate(d);
      if (!map[iso]) map[iso] = [];
      map[iso].push(c);
    }
    return map;
  }, [consultations, weekDays, viewMode]);

  // === Render consulta (card compacta) ===

  function renderConsultationChip(c: Consultation): ReactNode {
    const anyC: any = c;
    const fecha = parseDate(anyC.date);
    const hora = fecha ? formatHour(anyC.date) : '—';
    const paciente = anyC.patient?.name || `Paciente #${anyC.patient_id}`;
    const tutor = anyC.tutor?.name || '';
    const motivo = anyC.reason || anyC.visit_type || 'Sin motivo';

    const statusRaw = (anyC.status as string | undefined)?.toLowerCase();
    const isClosed = statusRaw === 'cerrada' || statusRaw === 'closed';
    const isCancelled = statusRaw === 'anulada' || statusRaw === 'cancelled';
    const isUpdating = updatingId === c.id;

    return (
      <div
        key={c.id}
        className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] shadow-sm"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">
              {hora} · {paciente}
            </span>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">
              {motivo}
              {tutor ? ` · Tutor: ${tutor}` : ''}
            </p>
            {anyC.doctor && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                Médico: {anyC.doctor.name ?? `#${anyC.doctor.id}`}
              </p>
            )}
          </div>
          <span className={statusPillClasses(anyC.status)}>{statusLabel(anyC.status)}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/consultas/${c.id}`)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-100"
            >
              Ver detalle
            </button>
            <button
              type="button"
              onClick={() => navigate(`/dashboard/consultas/${c.id}/editar`)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-slate-100"
            >
              Editar
            </button>

            {!isClosed && !isCancelled && (
              <>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleChangeStatus(c, 'cerrada')}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {isUpdating ? 'Actualizando…' : 'Marcar como atendida'}
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleChangeStatus(c, 'anulada')}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                >
                  Anular
                </button>
              </>
            )}

            {(isClosed || isCancelled) && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleChangeStatus(c, 'abierta')}
                className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] text-sky-800 hover:bg-sky-100 disabled:opacity-60"
              >
                Reabrir
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleCreatePaymentFromConsultation(c)}
            className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-900 hover:bg-amber-100"
          >
            Crear pago
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Agenda y calendario clínico">
      {/* Encabezado + controles */}
      <section className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-xs text-slate-400">Agenda de la clínica</p>
          <h2 className="text-sm font-semibold text-slate-800">{rangeLabel}</h2>
          <p className="text-xs text-slate-500">
            Gestiona las consultas programadas, controla la ocupación horaria y accede rápidamente al
            detalle de cada atención.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`rounded-xl border px-3 py-1.5 ${
                viewMode === 'day'
                  ? 'border-slate-800 bg-slate-900 text-slate-50'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              Vista día
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`rounded-xl border px-3 py-1.5 ${
                viewMode === 'week'
                  ? 'border-slate-800 bg-slate-900 text-slate-50'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              Vista semana
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftPeriod(-1)}
              className="rounded-xl border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={goToToday}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1 text-[11px] font-medium text-slate-50 hover:bg-slate-800"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => shiftPeriod(1)}
              className="rounded-xl border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-100"
            >
              ▶
            </button>
          </div>

          <div className="text-[11px] text-slate-500">
            Total de consultas en el período:{' '}
            <span className="font-semibold text-slate-800">{total}</span>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className="mb-4 card">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between text-xs">
          <div className="w-full md:max-w-xs">
            <label className="mb-1 block font-medium text-slate-500">Buscar</label>
            <input
              type="search"
              className="input"
              placeholder="Paciente, tutor, motivo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Filtra por nombre del paciente, tutor, motivo de la consulta, etc.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-40">
              <label className="mb-1 block font-medium text-slate-500">Estado</label>
              <select
                className="input"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as AgendaStatusFilter)}
              >
                <option value="all">Todos</option>
                <option value="open">Abiertas</option>
                <option value="pending">Pendientes</option>
                <option value="closed">Cerradas</option>
                <option value="cancelled">Anuladas</option>
              </select>
            </div>

            {doctors.length > 0 && (
              <div className="w-full sm:w-48">
                <label className="mb-1 block font-medium text-slate-500">Médico</label>
                <select
                  className="input"
                  value={doctorIdFilter}
                  onChange={e => setDoctorIdFilter(e.target.value)}
                >
                  <option value="all">Todos</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <button type="button" onClick={handleNewConsultation} className="btn-accent">
              Nueva consulta
            </button>
          </div>
        </div>
      </section>

      {/* Estado de carga / error */}
      {loading && <div className="card text-sm text-slate-600">Cargando agenda…</div>}

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

      {!loading && !error && (
        <>
          {viewMode === 'day' ? (
            <DayView
              selectedDate={selectedDate}
              hours={dayHours}
              consultationsByHour={consultationsByHour}
              renderConsultation={renderConsultationChip}
            />
          ) : (
            <WeekView
              days={weekDays}
              consultationsByDay={consultationsByDay}
              renderConsultation={renderConsultationChip}
            />
          )}
        </>
      )}
    </DashboardLayout>
  );
}

// ==== Subcomponentes de vista día y semana ====

interface DayViewProps {
  selectedDate: Date;
  hours: number[];
  consultationsByHour: Record<number, Consultation[]>;
  renderConsultation: (c: Consultation) => ReactNode;
}

function DayView({ selectedDate, hours, consultationsByHour, renderConsultation }: DayViewProps) {
  return (
    <section className="card p-0">
      <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between text-xs">
        <div className="flex flex-col">
          <span className="font-medium text-slate-700">Agenda del día</span>
          <span className="text-slate-500">{formatDateHuman(selectedDate)}</span>
        </div>
        <p className="text-[11px] text-slate-400">Cada fila representa una franja horaria de atención.</p>
      </div>

      <div className="max-h-[560px] overflow-y-auto">
        <table className="min-w-full border-collapse text-xs">
          <tbody>
            {hours.map(h => {
              const label = `${String(h).padStart(2, '0')}:00`;
              const items = consultationsByHour[h] ?? [];

              return (
                <tr key={h} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="w-20 px-3 py-3 align-top text-right text-[11px] text-slate-400">
                    {label}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {items.length === 0 ? (
                      <span className="text-[11px] text-slate-300">Sin consultas agendadas</span>
                    ) : (
                      <div className="flex flex-col gap-1.5">{items.map(i => renderConsultation(i))}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface WeekViewProps {
  days: Date[];
  consultationsByDay: Record<string, Consultation[]>;
  renderConsultation: (c: Consultation) => ReactNode;
}

function WeekView({ days, consultationsByDay, renderConsultation }: WeekViewProps) {
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between text-xs">
        <div>
          <p className="font-medium text-slate-700">Vista semanal</p>
          <p className="text-[11px] text-slate-400">Distribución de consultas por día de la semana.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 text-xs">
        {days.map(d => {
          const iso = toISODate(d);
          const items = consultationsByDay[iso] ?? [];

          const labelWeekday = d.toLocaleDateString('es-CL', { weekday: 'short' });
          const labelDay = d.getDate();

          return (
            <div
              key={iso}
              className="flex min-h-[200px] flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{labelWeekday}</span>
                  <span className="text-sm font-semibold text-slate-800">{labelDay}</span>
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 shadow-sm">
                  {items.length} consulta{items.length === 1 ? '' : 's'}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <span className="text-[11px] text-slate-300">Sin consultas</span>
                </div>
              ) : (
                <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
                  {items
                    .slice()
                    .sort((a, b) => {
                      const da = parseDate((a as any).date)?.getTime() ?? 0;
                      const db = parseDate((b as any).date)?.getTime() ?? 0;
                      return da - db;
                    })
                    .map(i => renderConsultation(i))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
