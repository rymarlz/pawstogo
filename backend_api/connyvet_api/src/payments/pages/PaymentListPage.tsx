// src/payments/pages/PaymentListPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { fetchPayments, deletePayment, type Payment, type PaymentFilters } from '../api';

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

function safeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function PaymentListPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [payments, setPayments] = useState<Payment[]>([]);

  // ✅ filtros reales para backend (sin search)
  const [filters, setFilters] = useState<PaymentFilters>({
    status: 'all',
    page: 1,
    per_page: 20,
  });

  // ✅ búsqueda local (solo front)
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

      setPayments(Array.isArray(res.data) ? res.data : []);
      setMeta((res.meta as any) ?? null);
    } catch (err: any) {
      console.error('Error cargando pagos:', err);
      setError(err?.message || 'No se pudieron cargar los pagos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch (err: any) {
      alert(err?.message || 'No se pudo eliminar el pago.');
    }
  }

  function canPrev() {
    if (!meta) return false;
    return meta.current_page > 1;
  }

  function canNext() {
    if (!meta) return false;
    return meta.current_page < meta.last_page;
  }

  const totalLabel =
    meta?.total != null
      ? `${meta.total} registro${meta.total === 1 ? '' : 's'}`
      : `${payments.length} registro${payments.length === 1 ? '' : 's'}`;

  function goToCreate() {
    navigate('/dashboard/pagos/nuevo');
  }

  function goToDetail(id: number) {
    navigate(`/dashboard/pagos/${id}`);
  }

  const visiblePayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return payments;

    return payments.filter(p => {
      const concept = (p.concept || '').toLowerCase();

      const paciente =
        (p as any)?.patient?.name ||
        (p as any)?.patient?.nombre ||
        '';

      const tutor =
        (p as any)?.tutor?.name ||
        (p as any)?.tutor?.full_name ||
        (p as any)?.tutor?.email ||
        '';

      return (
        concept.includes(term) ||
        String(paciente).toLowerCase().includes(term) ||
        String(tutor).toLowerCase().includes(term)
      );
    });
  }, [payments, search]);

  // ✅ mini resumen rápido (para cabecera)
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
      } else {
        pending += 1;
        totalPending += amount;
      }
    }

    return { paid, pending, totalPaid, totalPending };
  }, [visiblePayments]);

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

  function statusLabel(status: Payment['status']) {
    return status === 'paid' ? 'Pagado' : 'Pendiente';
  }

  function methodLabel(method?: Payment['method'] | null) {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'debito': return 'Débito';
      case 'credito': return 'Crédito';
      case 'transferencia': return 'Transferencia';
      default: return '—';
    }
  }

  const brandStyle = {
    borderColor: 'color-mix(in srgb, var(--brand) 25%, #e5e7eb)',
    backgroundColor: 'color-mix(in srgb, var(--brand) 8%, white)',
  } as const;

  return (
    <DashboardLayout title="Pagos / Caja">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Registro de pagos y cobros
          </h2>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            Controla pagos pendientes y pagados. (Webpay/Redcompra se integra después.)
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
            {totalLabel}
          </span>
          <button type="button" onClick={goToCreate} className="btn-accent">
            Registrar nuevo pago
          </button>
        </div>
      </div>

      {/* ✅ Resumen */}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm" style={brandStyle}>
          <p className="text-[11px] text-slate-500">Pendientes</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{summary.pending}</p>
          <p className="text-[11px] text-slate-600">{formatCurrency(summary.totalPending)}</p>
        </div>

        <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm" style={brandStyle}>
          <p className="text-[11px] text-slate-500">Pagados</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{summary.paid}</p>
          <p className="text-[11px] text-slate-600">{formatCurrency(summary.totalPaid)}</p>
        </div>

        <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm" style={brandStyle}>
          <p className="text-[11px] text-slate-500">Total visible</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{visiblePayments.length}</p>
          <p className="text-[11px] text-slate-600">
            {formatCurrency(summary.totalPaid + summary.totalPending)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="w-full md:max-w-sm">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Buscar (local)
            </label>
            <input
              type="search"
              placeholder="Paciente, tutor, concepto…"
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Esto filtra en el front. (El backend aún no expone búsqueda por texto.)
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="w-full sm:w-40">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Estado
              </label>
              <select
                className="input"
                value={(filters as any).status ?? 'all'}
                onChange={e => handleFilterChange('status' as any, e.target.value as any)}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendientes</option>
                <option value="paid">Pagados</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button type="button" onClick={handleRefresh} className="btn-ghost">
              Actualizar listado
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="card text-sm text-slate-600">Cargando pagos…</div>}

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
          {visiblePayments.length === 0 ? (
            <div className="card py-8 text-center text-sm text-slate-500">
              No hay pagos registrados o no se encontraron resultados.
            </div>
          ) : (
            <div className="card p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Paciente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Tutor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Concepto</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Monto</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Método</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiblePayments.map((p, idx) => {
                      const isPaid = p.status === 'paid';
                      const isEven = idx % 2 === 0;

                      const fecha = formatDate(p.created_at);
                      const paciente =
                        (p as any)?.patient?.name ||
                        (p as any)?.patient?.nombre ||
                        `Paciente #${p.patient_id}`;

                      const tutor =
                        (p as any)?.tutor?.name ||
                        (p as any)?.tutor?.full_name ||
                        (p as any)?.tutor?.email ||
                        (p.tutor_id ? `Tutor #${p.tutor_id}` : '—');

                      return (
                        <tr
                          key={p.id}
                          style={{
                            backgroundColor: isEven ? '#ffffff' : '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                          }}
                        >
                          <td className="px-4 py-3 align-middle text-slate-700">{fecha}</td>
                          <td className="px-4 py-3 align-middle text-slate-800">{paciente}</td>
                          <td className="px-4 py-3 align-middle text-slate-700">{tutor}</td>
                          <td className="px-4 py-3 align-middle text-slate-700">{p.concept}</td>
                          <td className="px-4 py-3 align-middle text-right text-slate-800">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px]"
                              style={{
                                backgroundColor: isPaid
                                  ? 'rgba(16,185,129,0.10)'
                                  : 'rgba(245,158,11,0.12)',
                                color: isPaid ? '#047857' : '#b45309',
                              }}
                            >
                              {statusLabel(p.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-slate-700">
                            {methodLabel(p.method)}
                          </td>
                          <td className="px-4 py-3 align-middle text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-2">
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ fontSize: '11px', padding: '0.35rem 0.8rem' }}
                                onClick={() => goToDetail(p.id)}
                              >
                                Ver detalle
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{
                                  fontSize: '11px',
                                  padding: '0.35rem 0.8rem',
                                  color: '#b91c1c',
                                }}
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
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
                  <div>Página {meta.current_page} de {meta.last_page}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!canPrev()}
                      onClick={() =>
                        setFilters(prev => ({
                          ...prev,
                          page: (prev.page ?? 1) - 1,
                        }))
                      }
                      className="btn-outline"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={!canNext()}
                      onClick={() =>
                        setFilters(prev => ({
                          ...prev,
                          page: (prev.page ?? 1) + 1,
                        }))
                      }
                      className="btn-outline"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
