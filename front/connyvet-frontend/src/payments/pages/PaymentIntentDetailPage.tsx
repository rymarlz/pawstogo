// src/payments/pages/PaymentIntentDetailPage.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import {
  getPaymentIntent,
  type PaymentIntent,
  type PaymentIntentStatus,
} from '../paymentIntentsApi';

const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 8;

function statusLabel(status: PaymentIntentStatus): string {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'pending':
      return 'Pendiente';
    case 'paid':
      return 'Pagado';
    case 'failed':
      return 'Rechazado / Fallido';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}

function statusStyle(status: PaymentIntentStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'failed':
    case 'cancelled':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'pending':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'draft':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/** Monto en centavos a mostrar en pesos (CLP). */
function formatCurrencyCentavos(centavos: number | null | undefined): string {
  if (centavos == null) return '—';
  const pesos = centavos / 100;
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(pesos);
}

export function PaymentIntentDetailPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const id = params.id ? Number(params.id) : NaN;
  const callbackStatus = searchParams.get('status') ?? null;
  const paymentId = searchParams.get('payment_id') ?? null;

  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollAttempts = useRef(0);

  const loadIntent = useCallback(async () => {
    if (!token || !id || Number.isNaN(id)) return;

    try {
      const res = await getPaymentIntent(token, id);
      setIntent(res.data);
      setError(null);
      return res.data;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string }; status?: number }; message?: string })
          ?.response?.data?.message ||
        (err as { message?: string })?.message ||
        'No se pudo cargar la intención de pago.';
      setError(message);
      setIntent(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!id || Number.isNaN(id)) {
      navigate('/dashboard/pagos');
      return;
    }

    loadIntent();
  }, [token, id, navigate, loadIntent]);

  // Polling: si el usuario vuelve del callback con status=approved y el intent aún no está paid
  useEffect(() => {
    if (loading || !intent || callbackStatus !== 'approved') return;
    if (intent.status === 'paid' || intent.status === 'failed' || intent.status === 'cancelled') {
      setPolling(false);
      return;
    }

    setPolling(true);
    pollAttempts.current = 0;

    const interval = setInterval(async () => {
      pollAttempts.current += 1;
      if (pollAttempts.current > POLL_MAX_ATTEMPTS) {
        clearInterval(interval);
        setPolling(false);
        return;
      }

      const updated = await loadIntent();
      if (
        updated &&
        (updated.status === 'paid' || updated.status === 'failed' || updated.status === 'cancelled')
      ) {
        clearInterval(interval);
        setPolling(false);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [loading, intent?.id, intent?.status, callbackStatus, loadIntent]);

  function handleRetry() {
    setLoading(true);
    setError(null);
    void loadIntent();
  }

  if (loading && !intent) {
    return (
      <DashboardLayout title="Intención de pago">
        <div className="card text-sm text-slate-600">Cargando intención de pago…</div>
      </DashboardLayout>
    );
  }

  if (error && !intent) {
    return (
      <DashboardLayout title="Intención de pago">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p className="font-medium">Error</p>
          <p className="mt-1">{error}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={handleRetry} className="btn-outline">
              Reintentar
            </button>
            <Link to="/dashboard/pagos" className="btn-ghost">
              Volver a Pagos
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!intent) {
    return (
      <DashboardLayout title="Intención de pago">
        <div className="card text-sm text-slate-600">
          No se encontró la intención de pago.
          <Link to="/dashboard/pagos" className="ml-2 text-sky-600 hover:underline">
            Volver a Pagos
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isPaid = intent.status === 'paid';
  const isFailed = intent.status === 'failed';
  const isCancelled = intent.status === 'cancelled';
  const isPending = intent.status === 'pending';
  const showVerifying = polling && callbackStatus === 'approved' && !isPaid && !isFailed;

  return (
    <DashboardLayout title="Detalle de pago online">
      <div className="max-w-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex items-center gap-1 text-xs text-slate-500">
            <Link to="/dashboard/pagos" className="hover:text-slate-700 hover:underline">
              Pagos
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">Pago online #{intent.id}</span>
          </nav>
          <Link to="/dashboard/pagos" className="btn-ghost text-xs">
            Volver a Pagos
          </Link>
        </div>

        {showVerifying && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-medium">Verificando pago…</p>
            <p className="mt-1 text-xs">
              Mercado Pago está confirmando el pago. Esta página se actualizará en unos segundos.
            </p>
          </div>
        )}

        <section className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {intent.title || `Pago online #${intent.id}`}
              </h2>
              {intent.description && (
                <p className="mt-1 text-xs text-slate-600">{intent.description}</p>
              )}
            </div>
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusStyle(
                intent.status,
              )}`}
            >
              {statusLabel(intent.status)}
            </span>
          </div>

          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-slate-500">Monto total</dt>
              <dd className="font-medium text-slate-900">
                {formatCurrencyCentavos(intent.amount_total)}
              </dd>
            </div>
            {intent.amount_paid > 0 && (
              <div>
                <dt className="text-slate-500">Monto pagado</dt>
                <dd className="font-medium text-slate-900">
                  {formatCurrencyCentavos(intent.amount_paid)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Proveedor</dt>
              <dd className="capitalize text-slate-700">
                {intent.provider === 'mercadopago' ? 'Mercado Pago' : intent.provider}
              </dd>
            </div>
            {paymentId && (
              <div>
                <dt className="text-slate-500">ID de pago (Mercado Pago)</dt>
                <dd className="font-mono text-xs text-slate-600">{paymentId}</dd>
              </div>
            )}
          </dl>

          {isPaid && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <p className="font-medium">Pago realizado correctamente.</p>
              <p className="mt-1 text-xs">
                El cobro se ha registrado en caja.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {intent.payment_id && (
                  <Link
                    to={`/dashboard/pagos/${intent.payment_id}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                  >
                    Ver registro en caja #{intent.payment_id} →
                  </Link>
                )}
                <Link
                  to="/dashboard/pagos"
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                >
                  Ir a lista de pagos
                </Link>
              </div>
            </div>
          )}

          {(isFailed || isCancelled) && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <p className="font-medium">
                {isFailed ? 'El pago no se completó.' : 'Este pago fue cancelado.'}
              </p>
              <p className="mt-1 text-xs">
                {isFailed
                  ? 'Si crees que es un error, intenta pagar de nuevo desde la lista de pagos.'
                  : 'Puedes crear una nueva intención de pago cuando lo necesites.'}
              </p>
            </div>
          )}

          {isPending && !showVerifying && (
            <p className="text-xs text-slate-500">
              Este pago está pendiente. Si ya abriste el enlace de Mercado Pago, completa el pago
              allí y serás redirigido de vuelta a esta página.
            </p>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
