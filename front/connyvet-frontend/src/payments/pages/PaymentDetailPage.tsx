// src/payments/pages/PaymentDetailPage.tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import {
  getPayment,
  markPaymentPaid,
  updatePayment,
  type Payment,
  type PaymentMethod,
} from '../api';

type Flash = { type: 'success' | 'error' | 'info'; message: string };
type FlashState = { flash?: Flash };

function flashClass(type: Flash['type']) {
  switch (type) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-sky-200 bg-sky-50 text-sky-700';
  }
}

export function PaymentDetailPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const params = useParams<{ id: string }>();
  const id = params.id ? Number(params.id) : NaN;

  const [data, setData] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const incomingFlash = useMemo<Flash | null>(() => {
    const st = (location.state as FlashState | null) ?? null;
    return st?.flash ?? null;
  }, [location.state]);

  const [flash, setFlash] = useState<Flash | null>(null);

  // marcar pagado
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (incomingFlash) {
      setFlash(incomingFlash);
      navigate(location.pathname, { replace: true, state: null });
      const t = window.setTimeout(() => setFlash(null), 3500);
      return () => window.clearTimeout(t);
    }
  }, [incomingFlash, navigate, location.pathname]);

  useEffect(() => {
    // ✅ guard profesional: redirige si no hay token o id inválido
    if (!token) {
      navigate('/login');
      return;
    }
    if (!id || Number.isNaN(id)) {
      navigate('/dashboard/pagos');
      return;
    }

    // ✅ ahora TS sabe que authToken es string
    const authToken = token;

    async function load() {
      setLoading(true);
      setErrorBanner(null);
      try {
        const res = await getPayment(authToken, id);
        setData(res.data);

        // preload
        setMethod(((res.data.method ?? '') as PaymentMethod | ''));
        setNotes(res.data.notes ?? '');
      } catch (err: any) {
        setErrorBanner(
          err?.response?.data?.message ||
            err?.message ||
            'No se pudo cargar el pago.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, id, navigate]);

  async function handleMarkPaid(e: FormEvent) {
    e.preventDefault();
    if (!token || !data) return;

    const authToken = token;

    if (data.status === 'paid') {
      setFlash({
        type: 'info',
        message: 'Este pago ya está marcado como pagado.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await markPaymentPaid(authToken, data.id, {

        method: method ? method : null,
        notes: notes.trim() || null,
      });

      setData(res.data);
      setFlash({ type: 'success', message: 'Pago marcado como pagado.' });
    } catch (err: any) {
      setFlash({
        type: 'error',
        message:
          err?.response?.data?.message ||
          err?.message ||
          'No se pudo marcar como pagado.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBackToPending() {
    if (!token || !data) return;

    const authToken = token;

    setSubmitting(true);
    try {
      const res = await updatePayment(authToken, data.id, {
        concept: data.concept,
        amount: data.amount,
        status: 'pending',
        method: data.method ?? null,
        notes: data.notes ?? null,
      });

      setData(res.data);
      setFlash({ type: 'success', message: 'Pago vuelto a Pendiente.' });
    } catch (err: any) {
      setFlash({
        type: 'error',
        message:
          err?.response?.data?.message || err?.message || 'No se pudo actualizar.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return '—';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <DashboardLayout title="Detalle de pago">
      {flash && (
        <section
          className={`mb-4 rounded-2xl border px-3 py-2 text-xs ${flashClass(
            flash.type,
          )}`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="whitespace-pre-line">{flash.message}</span>
            <button
              type="button"
              onClick={() => setFlash(null)}
              className="text-[11px] underline decoration-dotted opacity-80 hover:opacity-100"
            >
              Cerrar
            </button>
          </div>
        </section>
      )}

      {loading && (
        <section className="card text-xs text-slate-600">Cargando pago…</section>
      )}

      {!loading && errorBanner && (
        <section className="card text-xs text-rose-700 bg-rose-50 border-rose-200">
          {errorBanner}
        </section>
      )}

      {!loading && !errorBanner && data && (
        <div className="space-y-4">
          <section className="card text-xs flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Pagos
              </p>
              <h1 className="text-sm font-semibold text-slate-800">
                Pago #{data.id}
              </h1>
              <p className="mt-1 text-[11px] text-slate-500">
                Estado: <span className="font-medium">{data.status}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Link
                to="/dashboard/pagos"
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
              >
                Volver
              </Link>

              <Link
                to={`/dashboard/pagos/${data.id}/editar`}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
              >
                Editar
              </Link>

              {data.status === 'paid' && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleBackToPending}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                >
                  Volver a pendiente
                </button>
              )}
            </div>
          </section>

          <section className="card text-xs grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-[11px] text-slate-400">Paciente</p>
              <p className="text-sm font-semibold text-slate-800">
                {(data as any)?.patient?.name ||
                  (data as any)?.patient?.nombre ||
                  `#${data.patient_id}`}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Concepto</p>
              <p className="text-sm font-semibold text-slate-800">
                {data.concept}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400">Monto</p>
              <p className="text-sm font-semibold text-slate-800">
                {formatCurrency(data.amount)}
              </p>
            </div>
          </section>

          <section className="card text-xs">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              Marcar pagado (manual)
            </h2>

            {data.status === 'paid' ? (
              <p className="text-[11px] text-slate-500">
                Este pago ya está pagado. Método: <b>{data.method ?? '—'}</b>
              </p>
            ) : (
              <form
                onSubmit={handleMarkPaid}
                className="grid gap-3 md:grid-cols-3 items-end"
              >
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Método
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod | '')}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="debito">Débito</option>
                    <option value="credito">Crédito</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Notas / referencia
                  </label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                    placeholder="N° boleta / transferencia / observación"
                  />
                </div>

                <div className="md:col-span-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {submitting ? 'Guardando…' : 'Marcar pagado'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="card text-xs">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">Notas</h2>
            <p className="text-[11px] text-slate-600 whitespace-pre-line">
              {data.notes ?? '—'}
            </p>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
