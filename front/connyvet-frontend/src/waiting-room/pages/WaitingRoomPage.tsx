import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import {
  attendWaitingRoomEntry,
  cancelWaitingRoomEntry,
  createWaitingRoomEntry,
  fetchWaitingRoomEntries,
  startWaitingRoomEntry,
} from '../api';
import { WaitingRoomForm, type WaitingRoomFormValues } from '../components/WaitingRoomForm';
import type { WaitingRoomEntry, WaitingRoomStatus } from '../types';

const STATUS_LABEL: Record<WaitingRoomStatus, string> = {
  esperando: 'Esperando',
  en_atencion: 'En atención',
  atendido: 'Atendido',
  cancelado: 'Cancelado',
};

function formatTime(value?: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function patientLabel(entry: WaitingRoomEntry): string {
  const id = entry.patient?.file_number ?? entry.patient?.id ?? entry.patient_id;
  const name = entry.patient?.name?.trim();
  if (name && id) return `Ficha #${id} - ${name}`;
  if (name) return name;
  if (id) return `Paciente #${id}`;
  return '—';
}

function speciesLabel(entry: WaitingRoomEntry): string {
  return (
    entry.patient?.species_display?.trim() ||
    entry.patient?.species?.trim() ||
    '—'
  );
}

function tutorLabel(entry: WaitingRoomEntry): string {
  return entry.tutor?.name?.trim() || `Tutor #${entry.tutor_id}`;
}

function statusBadgeClass(status: WaitingRoomStatus): string {
  switch (status) {
    case 'esperando':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'en_atencion':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    case 'atendido':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'cancelado':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function priorityBadgeClass(priority: string): string {
  return priority === 'urgente'
    ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-slate-50 text-slate-600 border-slate-200';
}

export function WaitingRoomPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [entries, setEntries] = useState<WaitingRoomEntry[]>([]);
  const [attendedToday, setAttendedToday] = useState<WaitingRoomEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [activeRes, todayRes] = await Promise.all([
        fetchWaitingRoomEntries(token, {
          include_history: showHistory,
          per_page: 100,
        }),
        fetchWaitingRoomEntries(token, { attended_today: true, per_page: 100 }),
      ]);

      setEntries(activeRes.data ?? []);
      setAttendedToday(todayRes.data ?? []);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'No se pudo cargar la sala de espera.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, showHistory]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const stats = useMemo(() => {
    const esperando = entries.filter((e) => e.status === 'esperando').length;
    const enAtencion = entries.filter((e) => e.status === 'en_atencion').length;
    const urgentes = entries.filter(
      (e) =>
        e.priority === 'urgente' &&
        (e.status === 'esperando' || e.status === 'en_atencion'),
    ).length;
    const atendidosHoy = attendedToday.length;

    return { esperando, enAtencion, urgentes, atendidosHoy };
  }, [entries, attendedToday]);

  async function handleCreate(formValues: WaitingRoomFormValues) {
    if (!token) return;

    setSubmitting(true);
    setError(null);

    try {
      await createWaitingRoomEntry(token, {
        tutor_id: Number(formValues.tutor_id),
        patient_id: Number(formValues.patient_id),
        reason: formValues.reason.trim(),
        priority: formValues.priority,
        notes: formValues.notes.trim() || null,
      });
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'No se pudo agregar a la sala de espera.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(
    id: number,
    action: 'start' | 'attend' | 'cancel',
  ) {
    if (!token) return;

    setActionId(id);
    setError(null);

    try {
      if (action === 'start') await startWaitingRoomEntry(token, id);
      if (action === 'attend') await attendWaitingRoomEntry(token, id);
      if (action === 'cancel') await cancelWaitingRoomEntry(token, id);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'No se pudo actualizar el estado.';
      setError(message);
    } finally {
      setActionId(null);
    }
  }

  function handleStartAttention(entry: WaitingRoomEntry) {
    const params = new URLSearchParams({
      patient_id: String(entry.patient_id),
      tutor_id: String(entry.tutor_id),
      reason: entry.reason,
      waiting_room_id: String(entry.id),
    });

    if (entry.status === 'esperando') {
      startWaitingRoomEntry(token!, entry.id)
        .then(() => {
          navigate(`/dashboard/consultas/nueva?${params.toString()}`);
        })
        .catch((err: unknown) => {
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message?: string }).message)
              : 'No se pudo iniciar la atención.';
          setError(message);
        });
      return;
    }

    navigate(`/dashboard/consultas/nueva?${params.toString()}`);
  }

  function openChart(entry: WaitingRoomEntry) {
    navigate(`/dashboard/fichas/${entry.patient_id}`);
  }

  const visibleEntries = showHistory
    ? entries
    : entries.filter(
        (e) => e.status === 'esperando' || e.status === 'en_atencion',
      );

  return (
    <DashboardLayout title="Sala de espera">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Clínica
          </p>
          <h1 className="text-sm font-semibold text-slate-800">
            Sala de espera
          </h1>
          <p className="mt-1 text-[11px] text-slate-500">
            Registra pacientes que llegaron y gestiona el orden de atención.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary"
            style={{ fontSize: '12px' }}
          >
            {showForm ? 'Cerrar formulario' : '+ Ingresar paciente'}
          </button>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="btn-ghost"
            style={{ fontSize: '12px' }}
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Esperando', value: stats.esperando, tone: 'text-amber-700' },
          { label: 'En atención', value: stats.enAtencion, tone: 'text-sky-700' },
          { label: 'Urgentes', value: stats.urgentes, tone: 'text-rose-700' },
          { label: 'Atendidos hoy', value: stats.atendidosHoy, tone: 'text-emerald-700' },
        ].map((card) => (
          <div key={card.label} className="card" style={{ padding: '0.9rem 1rem' }}>
            <p className="text-[11px] text-slate-500">{card.label}</p>
            <p className={`text-2xl font-semibold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {showForm && token && (
        <div className="card mb-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Nuevo ingreso
          </h2>
          <WaitingRoomForm
            token={token}
            submitting={submitting}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="card">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-800">
            Pacientes en sala
          </h2>
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={showHistory}
              onChange={(e) => setShowHistory(e.target.checked)}
              className="rounded border-slate-300"
            />
            Mostrar historial (atendidos y cancelados)
          </label>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Cargando sala de espera…</p>
        ) : visibleEntries.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay pacientes en la sala de espera.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2 text-left font-medium">Hora</th>
                  <th className="px-3 py-2 text-left font-medium">Paciente</th>
                  <th className="px-3 py-2 text-left font-medium">Especie</th>
                  <th className="px-3 py-2 text-left font-medium">Tutor</th>
                  <th className="px-3 py-2 text-left font-medium">Motivo</th>
                  <th className="px-3 py-2 text-left font-medium">Prioridad</th>
                  <th className="px-3 py-2 text-left font-medium">Estado</th>
                  <th className="px-3 py-2 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((entry) => {
                  const busy = actionId === entry.id;
                  const isActive =
                    entry.status === 'esperando' ||
                    entry.status === 'en_atencion';

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="px-3 py-2 align-top">
                        {formatTime(entry.arrived_at)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium text-slate-800">
                          {patientLabel(entry)}
                        </div>
                        {entry.patient?.breed && (
                          <div className="text-[11px] text-slate-500">
                            {entry.patient.breed}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">
                        {speciesLabel(entry)}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="text-slate-700">{tutorLabel(entry)}</div>
                        {entry.tutor?.rut && (
                          <div className="text-[11px] text-slate-500">
                            RUT: {entry.tutor.rut}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">
                        {entry.reason}
                        {entry.notes && (
                          <div className="text-[11px] text-slate-500">
                            {entry.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${priorityBadgeClass(entry.priority)}`}
                        >
                          {entry.priority === 'urgente' ? 'Urgente' : 'Normal'}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${statusBadgeClass(entry.status)}`}
                        >
                          {STATUS_LABEL[entry.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col items-end gap-1">
                          {isActive && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleStartAttention(entry)}
                              className="btn-primary"
                              style={{ fontSize: '11px', padding: '0.35rem 0.7rem' }}
                            >
                              Iniciar atención
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openChart(entry)}
                            className="btn-ghost"
                            style={{ fontSize: '11px', padding: '0.35rem 0.7rem' }}
                          >
                            Abrir ficha
                          </button>
                          {entry.status === 'esperando' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => runAction(entry.id, 'start')}
                              className="btn-secondary"
                              style={{ fontSize: '11px', padding: '0.35rem 0.7rem' }}
                            >
                              Marcar en atención
                            </button>
                          )}
                          {isActive && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => runAction(entry.id, 'attend')}
                              className="btn-secondary"
                              style={{ fontSize: '11px', padding: '0.35rem 0.7rem' }}
                            >
                              Marcar atendido
                            </button>
                          )}
                          {isActive && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => runAction(entry.id, 'cancel')}
                              className="btn-ghost"
                              style={{
                                fontSize: '11px',
                                padding: '0.35rem 0.7rem',
                                color: '#b91c1c',
                              }}
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
