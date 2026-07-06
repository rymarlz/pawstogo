// src/payments/pages/PaymentListPage.tsx
// Lista profesional de pagos con indicadores claros y CTA destacado
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { fetchPayments, deletePayment, type Payment, type PaymentFilters } from '../api';

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('es-CL');
}

function statusLabel(status: Payment['status']): string {
  if (status === 'paid') return 'Pagado';
  if (status === 'cancelled') return 'Cancelado';
  return 'Pendiente';
}

function statusBadgeClass(status: Payment['status']): string {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (status === 'cancelled') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
}

function methodLabel(method?: Payment['method'] | null): string {
  switch (method) {
    case 'efectivo': return 'Efectivo';
    case 'debito': return 'Débito';
    case 'credito': return 'Crédito';
    case 'transferencia': return 'Transferencia';
    case 'mercadopago': return 'Mercado Pago';
    default: return '—';
  }
}

export function PaymentListPage() {
  const { token } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [filters, setFilters] = useState<PaymentFilters>({
    status: 'all',
    page: 1,
    per_page: 20,
  });
  const [search, setSearch] = useState('');
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      const res = await fetchPayments(token, filters);
      const data = res?.data ?? res;
      setPayments(Array.isArray(data) ? data : []);
      setMeta((res as { meta?: Meta })?.meta ?? null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'No se pudieron cargar los pagos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filters.status, filters.page, token, refreshKey]);

  function handleFilterChange<K extends keyof PaymentFilters>(
    field: K,
    value: PaymentFilters[K],
  ) {
    setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
  }

  function handleRefresh() {
    setRefreshKey(k => k + 1);
  }

  async function handleDelete(id: number) {
    if (!token) return;
    const ok = window.confirm('¿Eliminar este pago? Esta acción no se puede deshacer.');
    if (!ok) return;

    try {
      await deletePayment(token, id);
      await load();
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e?.message || 'No se pudo eliminar el pago.');
    }
  }

  const canPrev = meta ? meta.current_page > 1 : false;
  const canNext = meta ? meta.current_page < meta.last_page : false;

  const totalLabel =
    meta?.total != null
      ? `${meta.total} registro${meta.total === 1 ? '' : 's'}`
      : `${payments.length} registro${payments.length === 1 ? '' : 's'}`;

  const visiblePayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return payments;

    return payments.filter(p => {
      const concept = (p.concept || '').toLowerCase();
      const paciente =
        (p as { patient?: { name?: string; nombre?: string } })?.patient?.name ||
        (p as { patient?: { nombre?: string } })?.patient?.nombre ||
        '';
      const tutor =
        (p as { tutor?: { name?: string; full_name?: string; email?: string } })?.tutor?.name ||
        (p as { tutor?: { full_name?: string } })?.tutor?.full_name ||
        (p as { tutor?: { email?: string } })?.tutor?.email ||
        '';
      return (
        concept.includes(term) ||
        String(paciente).toLowerCase().includes(term) ||
        String(tutor).toLowerCase().includes(term)
      );
    });
  }, [payments, search]);

  const summary = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let totalPaid = 0;
    let totalPending = 0;

    for (const p of visiblePayments) {
      const amount = safeNumber(p.amount, 0);
      if (p.status === 'paid') {
        paid += 1;
        totalPaid += amount;
      } else if (p.status !== 'cancelled') {
        pending += 1;
        totalPending += amount;
      }
    }

    return { paid, pending, totalPaid, totalPending };
  }, [visiblePayments]);

  return (
    <DashboardLayout title="Pagos / Caja">
      {/* CTA principal: Crear pago */}
      <section className="mb-6 rounded-2xl border-2 border-sky-200 bg-sky-50/60 px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-sky-900">
              Crear pago y enviar link al tutor
            </h2>
            <p className="mt-1 text-sm text-sky-700/90">
              Genera un link de Mercado Pago y envíalo por correo. El tutor paga de forma segura.
            </p>
          </div>
          <Link
            to="/dashboard/pagos/nuevo"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#009ee3] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#0088c7] transition-colors"
          >
            <span>Crear pago</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Título y resumen */}
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Listado de pagos</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Pagos pendientes y pagados. Desde el detalle puedes copiar el link o reenviar el correo.
          </p>
        </div>
        <span className="inline-flex rounded-full bg-slate-100 px-4 py-1.5 text-sm text-slate-600">
          {totalLabel}
        </span>
      </div>

      {/* Cards de resumen */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Pendientes
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.pending}</p>
          <p className="text-sm text-slate-600">{formatCurrency(summary.totalPending)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 px-5 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
            Pagados
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{summary.paid}</p>
          <p className="text-sm text-emerald-700">{formatCurrency(summary.totalPaid)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total visible
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{visiblePayments.length}</p>
          <p className="text-sm text-slate-600">
            {formatCurrency(summary.totalPaid + summary.totalPending)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <section className="card mb-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-sm">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Buscar (local)
            </label>
            <input
              type="search"
              placeholder="Paciente, tutor, concepto…"
              className="input w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-40">
              <label className="mb-1 block text-xs font-medium text-slate-500">Estado</label>
              <select
                className="input w-full"
                value={filters.status ?? 'all'}
                onChange={e => handleFilterChange('status', e.target.value as PaymentFilters['status'])}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="paid">Pagados</option>
                <option value="cancelled">Cancelados</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Actualizar
            </button>
          </div>
        </div>
      </section>

      {loading && (
        <section className="card flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
        </section>
      )}

      {error && !loading && (
        <section
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-700"
        >
          <p className="font-medium">Error</p>
          <p className="mt-1 text-sm">{error}</p>
        </section>
      )}

      {!loading && !error && (
        <>
          {visiblePayments.length === 0 ? (
            <section className="card py-12 text-center text-slate-500">
              <p className="text-sm">No hay pagos registrados o no se encontraron resultados.</p>
              <Link
                to="/dashboard/pagos/nuevo"
                className="mt-3 inline-block text-sky-600 hover:underline text-sm font-medium"
              >
                Crear primer pago
              </Link>
            </section>
          ) : (
            <section className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Paciente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Tutor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Concepto
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Monto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Link
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Método
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePayments.map((p, idx) => {
                      const hasLink = Boolean((p as { payment_link?: string })?.payment_link?.trim());

                      const paciente =
                        (p as { patient?: { name?: string; nombre?: string } })?.patient?.name ||
                        (p as { patient?: { nombre?: string } })?.patient?.nombre ||
                        `Paciente #${p.patient_id}`;

                      const tutor =
                        (p as { tutor?: { name?: string; full_name?: string; email?: string } })?.tutor?.name ||
                        (p as { tutor?: { full_name?: string } })?.tutor?.full_name ||
                        (p as { tutor?: { email?: string } })?.tutor?.email ||
                        (p.tutor_id ? `Tutor #${p.tutor_id}` : '—');

                      return (
                        <tr
                          key={p.id}
                          className={`border-b border-slate-100 ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                          }`}
                        >
                          <td className="px-4 py-3 text-slate-700">{formatDate(p.created_at)}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{paciente}</td>
                          <td className="px-4 py-3 text-slate-700">{tutor}</td>
                          <td className="px-4 py-3 text-slate-700">{p.concept}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(
                                p.status,
                              )}`}
                            >
                              {statusLabel(p.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {hasLink ? (
                              <span
                                className="inline-flex items-center gap-1 rounded bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700"
                                title="Tiene link de pago"
                              >
                                ✓
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {methodLabel(p.method)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/dashboard/pagos/${p.id}`}
                                className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100"
                              >
                                Ver detalle
                              </Link>
                              <button
                                type="button"
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
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

              {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
                  <span>Página {meta.current_page} de {meta.last_page}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!canPrev}
                      onClick={() =>
                        setFilters(prev => ({
                          ...prev,
                          page: (prev.page ?? 1) - 1,
                        }))
                      }
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={!canNext}
                      onClick={() =>
                        setFilters(prev => ({
                          ...prev,
                          page: (prev.page ?? 1) + 1,
                        }))
                      }
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
