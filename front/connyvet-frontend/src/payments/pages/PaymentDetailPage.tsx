// src/payments/pages/PaymentDetailPage.tsx
// Vista profesional de detalle de pago con branding Mercado Pago
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import {
  getPayment,
  markPaymentPaid,
  updatePayment,
  resendPaymentLink,
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
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: Payment['status'] }) {
  const config = {
    paid: { label: 'Pagado', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    cancelled: { label: 'Cancelado', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    pending: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  };
  const { label, className } = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

export function PaymentDetailPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const params = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const id = params.id ? Number(params.id) : NaN;
  const mpStatus = searchParams.get('mp_status');

  const [data, setData] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const incomingFlash = useMemo<Flash | null>(() => {
    const st = (location.state as FlashState | null) ?? null;
    return st?.flash ?? null;
  }, [location.state]);

  const [flash, setFlash] = useState<Flash | null>(null);

  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (incomingFlash) {
      setFlash(incomingFlash);
      navigate(location.pathname, { replace: true, state: null });
      const t = window.setTimeout(() => setFlash(null), 3500);
      return () => window.clearTimeout(t);
    }
  }, [incomingFlash, navigate, location.pathname]);

  useEffect(() => {
    if (!mpStatus || !token || !id || Number.isNaN(id)) return;

    if (mpStatus === 'approved') {
      setFlash({ type: 'success', message: 'El pago fue confirmado por Mercado Pago.' });
      setSearchParams({}, { replace: true });
      const t = window.setTimeout(() => setFlash(null), 5000);
      return () => window.clearTimeout(t);
    }
    if (mpStatus === 'rejected') {
      setFlash({ type: 'error', message: 'El pago fue rechazado por Mercado Pago.' });
      setSearchParams({}, { replace: true });
      const t = window.setTimeout(() => setFlash(null), 6000);
      return () => window.clearTimeout(t);
    }
    if (mpStatus === 'pending') {
      setFlash({ type: 'info', message: 'El pago está pendiente. Mercado Pago notificará cuando se confirme.' });
      setSearchParams({}, { replace: true });
      const t = window.setTimeout(() => setFlash(null), 5000);
      return () => window.clearTimeout(t);
    }
  }, [mpStatus, setSearchParams, token, id]);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!id || Number.isNaN(id)) {
      navigate('/dashboard/pagos');
      return;
    }

    const authToken = token;

    async function load() {
      setLoading(true);
      setErrorBanner(null);
      try {
        const res = await getPayment(authToken, id);
        const payment = res?.data ?? res ?? null;
        setData(payment);

        if (payment) {
          setMethod(((payment.method ?? '') as PaymentMethod | ''));
          setNotes(payment.notes ?? '');
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        setErrorBanner(
          e?.response?.data?.message ||
            e?.message ||
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

    if (data.status === 'paid') {
      setFlash({ type: 'info', message: 'Este pago ya está marcado como pagado.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await markPaymentPaid(token, data.id, {
        method: method ? method : null,
        notes: notes.trim() || null,
      });
      const updated = res?.data ?? res ?? data;
      if (updated) setData(updated);
      setFlash({ type: 'success', message: 'Pago marcado como pagado.' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setFlash({
        type: 'error',
        message: e?.response?.data?.message || e?.message || 'No se pudo marcar como pagado.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBackToPending() {
    if (!token || !data) return;

    setSubmitting(true);
    try {
      const res = await updatePayment(token, data.id, {
        concept: data.concept,
        amount: data.amount,
        status: 'pending',
        method: data.method ?? null,
        notes: data.notes ?? null,
      });
      const updated = res?.data ?? res ?? data;
      if (updated) setData(updated);
      setFlash({ type: 'success', message: 'Pago vuelto a Pendiente.' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setFlash({
        type: 'error',
        message: e?.response?.data?.message || e?.message || 'No se pudo actualizar.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const tutorEmail = data
    ? (data.tutor?.email ?? data.tutor?.email_para_pagos ?? data.patient?.tutor_email ?? null)
    : null;
  const hasTutorEmail = Boolean(tutorEmail?.trim());
  const tutorName = data
    ? (data.tutor?.name ??
       (data.tutor?.nombres || data.tutor?.apellidos
         ? `${data.tutor?.nombres ?? ''} ${data.tutor?.apellidos ?? ''}`.trim()
         : null) ??
       data.patient?.tutor_name ??
       null)
    : null;
  const patientName = data
    ? (data.patient?.name ?? data.patient?.nombre ?? `Paciente #${data.patient_id ?? '?'}`)
    : '—';
  const isPaid = data?.status === 'paid';
  const isCancelled = data?.status === 'cancelled';
  const hasPaymentLink = Boolean(data?.payment_link?.trim());
  const emailSent = Boolean(data?.email_sent_at);
  const emailError = data?.email_error ?? null;

  async function handleResendLink() {
    if (!token || !data) return;
    setResending(true);
    try {
      const res = await resendPaymentLink(token, data.id);
      const updated = res?.data ?? (res as { data?: Payment })?.data ?? data;
      if (updated) setData(updated);
      setFlash({ type: 'success', message: (res as { message?: string })?.message ?? 'Link reenviado correctamente.' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setFlash({
        type: 'error',
        message: e?.response?.data?.message ?? e?.message ?? 'No se pudo reenviar el correo.',
      });
    } finally {
      setResending(false);
    }
  }

  async function handleCopyLink() {
    const link = data?.payment_link;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setFlash({ type: 'success', message: 'Link copiado al portapapeles.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFlash({ type: 'error', message: 'No se pudo copiar el link.' });
    }
  }

  function handlePayWithMercadoPago() {
    const link = data?.payment_link;
    if (!link) return;
    window.location.href = link;
  }

  // ─── Guards de render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout title="Detalle de pago">
        <section className="card flex items-center justify-center py-12">
          <div className="text-center text-slate-500">
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500 mx-auto" />
            <p className="text-sm">Cargando pago…</p>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  if (errorBanner) {
    return (
      <DashboardLayout title="Detalle de pago">
        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-700">
          <p className="font-medium">Error</p>
          <p className="mt-1 text-sm">{errorBanner}</p>
          <div className="mt-4 flex gap-2">
            <Link to="/dashboard/pagos" className="btn-outline text-sm">
              Volver a Pagos
            </Link>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Detalle de pago">
        <section className="card py-8 text-center text-slate-600">
          <p className="text-sm">No se pudo cargar el pago.</p>
          <Link to="/dashboard/pagos" className="mt-2 inline-block text-sky-600 hover:underline text-sm">
            Volver a Pagos
          </Link>
        </section>
      </DashboardLayout>
    );
  }

  // ─── Contenido principal ──────────────────────────────────────────────
  return (
    <DashboardLayout title="Detalle de pago">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Flash */}
        {flash && (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm ${flashClass(flash.type)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="whitespace-pre-line">{flash.message}</span>
              <button
                type="button"
                onClick={() => setFlash(null)}
                className="text-xs underline decoration-dotted opacity-80 hover:opacity-100"
              >
                Cerrar
              </button>
            </div>
          </section>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-slate-500">
          <Link to="/dashboard/pagos" className="hover:text-slate-700 hover:underline">
            Pagos
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-700">Pago #{data.id}</span>
        </nav>

        {/* Banners de estado */}
        {isPaid && (
          <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="text-xl" aria-hidden>✓</span>
              <p className="font-semibold">Pago confirmado</p>
            </div>
            <p className="mt-1 text-sm text-emerald-700">
              Este cobro fue registrado correctamente.
              {data.mercadopago_status && (
                <span className="block mt-0.5 text-xs">Mercado Pago: {data.mercadopago_status}</span>
              )}
            </p>
          </section>
        )}

        {!isPaid && !isCancelled && hasPaymentLink && (
          <section className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3">
            <p className="font-semibold text-amber-900">Pago pendiente</p>
            <p className="mt-1 text-sm text-amber-800">
              El tutor aún no ha completado el pago. Puede usar el link para pagar con Mercado Pago.
            </p>
          </section>
        )}

        {emailError && hasPaymentLink && !isPaid && !isCancelled && (
          <section className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3">
            <p className="font-semibold text-rose-800">El correo no se pudo enviar</p>
            <p className="mt-1 text-sm text-rose-700">
              {emailError}
            </p>
            <p className="mt-2 text-xs text-rose-600">
              El link de pago existe. Copia el link y envíalo manualmente al tutor (WhatsApp, SMS, etc.).
            </p>
          </section>
        )}

        {!hasTutorEmail && hasPaymentLink && !isPaid && !isCancelled && (
          <section className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3">
            <p className="font-semibold text-amber-900">El tutor no tiene correo configurado</p>
            <p className="mt-1 text-sm text-amber-800">
              No se pudo enviar el link por email. Copia el link y envíalo manualmente (WhatsApp, SMS, etc.).
            </p>
          </section>
        )}

        {/* Encabezado principal */}
        <section
          className={`rounded-2xl border-2 px-6 py-5 ${
            isPaid
              ? 'border-emerald-200 bg-emerald-50/50'
              : isCancelled
                ? 'border-slate-200 bg-slate-50/50'
                : 'border-sky-200 bg-sky-50/40'
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900">Pago #{data.id}</h1>
                <StatusBadge status={data.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Creado: {formatDate(data.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/dashboard/pagos"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Volver
              </Link>
              {data.payment_intent_id && (
                <Link
                  to={`/dashboard/pagos/intento/${data.payment_intent_id}`}
                  className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
                >
                  Ver pago online
                </Link>
              )}
              {!data.payment_intent_id && (
                <Link
                  to={`/dashboard/pagos/${data.id}/editar`}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Editar
                </Link>
              )}
              {isPaid && !data.payment_intent_id && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleBackToPending}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                >
                  Volver a pendiente
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Columna izquierda: Resumen + Tutor */}
          <div className="space-y-6 lg:col-span-2">
            {/* Resumen del pago */}
            <section className="card">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Resumen del pago
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-400">Concepto</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{data.concept ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Monto</dt>
                  <dd className="mt-0.5 text-lg font-bold text-slate-900">
                    {formatCurrency(data.amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Fecha de creación</dt>
                  <dd className="mt-0.5 font-medium text-slate-700">
                    {formatDate(data.created_at)}
                  </dd>
                </div>
                {isPaid && data.paid_at && (
                  <div>
                    <dt className="text-xs text-slate-400">Fecha de pago</dt>
                    <dd className="mt-0.5 font-medium text-slate-700">
                      {formatDate(data.paid_at)}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Tutor */}
            <section className="card">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Tutor
              </h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-400">Nombre</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{tutorName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Email</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{tutorEmail ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Mascota</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{patientName}</dd>
                </div>
                {hasPaymentLink && (
                  <>
                    <div>
                      <dt className="text-xs text-slate-400">Estado del correo</dt>
                      <dd className="mt-0.5 font-medium">
                        {emailSent ? (
                          <span className="text-emerald-700">Enviado {formatDate(data.email_sent_at)}</span>
                        ) : emailError ? (
                          <span className="text-rose-700" title={emailError}>Falló</span>
                        ) : !hasTutorEmail ? (
                          <span className="text-amber-700">Sin email del tutor</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </dd>
                    </div>
                    {emailSent && data.email_sent_at && (
                      <div>
                        <dt className="text-xs text-slate-400">Último envío</dt>
                        <dd className="mt-0.5 font-medium text-slate-700">
                          {formatDate(data.email_sent_at)}
                        </dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
            </section>
          </div>

          {/* Columna derecha: Acciones + Pago Mercado Pago */}
          <div className="space-y-6">
            {/* Pago con Mercado Pago */}
            {hasPaymentLink && !isPaid && !isCancelled && (
              <section className="card border-2 border-sky-200 bg-sky-50/30">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Pago seguro con
                  </span>
                  <span className="rounded bg-[#009ee3] px-2 py-0.5 text-xs font-bold text-white">
                    Mercado Pago
                  </span>
                </div>
                <p className="mb-4 text-xs text-slate-600">
                  El tutor puede pagar con tarjeta, transferencia o cuenta de Mercado Pago.
                </p>
                <button
                  type="button"
                  onClick={handlePayWithMercadoPago}
                  className="w-full rounded-xl bg-[#009ee3] px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#0088c7] transition-colors flex items-center justify-center gap-2"
                >
                  <span>Pagar con Mercado Pago</span>
                  <span aria-hidden>→</span>
                </button>
              </section>
            )}

            {isPaid && (
              <section className="card border-2 border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center gap-2 text-emerald-800">
                  <span className="text-2xl" aria-hidden>✓</span>
                  <h3 className="font-semibold">Pago confirmado</h3>
                </div>
                <p className="mt-2 text-xs text-emerald-700">
                  Este cobro fue registrado correctamente.
                  {data.method && (
                    <span className="block mt-1">Método: {data.method}</span>
                  )}
                </p>
              </section>
            )}

            {/* Acciones: copiar link, reenviar */}
            {hasPaymentLink && (
              <section className="card">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Acciones
                </h2>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={data.payment_link ?? ''}
                      className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600 truncate"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 shrink-0"
                    >
                      {copied ? 'Copiado' : 'Copiar link'}
                    </button>
                  </div>
                  {!isPaid && !isCancelled && (
                    <button
                      type="button"
                      disabled={resending || !hasTutorEmail}
                      onClick={handleResendLink}
                      className="w-full rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resending ? 'Enviando…' : 'Reenviar correo al tutor'}
                    </button>
                  )}
                </div>
                {!hasTutorEmail && !isPaid && !isCancelled && (
                  <p className="mt-2 text-xs text-amber-700">
                    El tutor no tiene email. Copia el link y envíalo por WhatsApp o SMS.
                  </p>
                )}
              </section>
            )}

            {/* Marcar pagado (registro en caja) */}
            {!data.payment_intent_id && (
              <section className="card">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Marcar pagado (registro en caja)
                </h2>
                <p className="mb-3 text-xs text-slate-500">
                  Si el tutor pagó en efectivo, débito o transferencia en ventanilla.
                </p>

                {data.status === 'paid' ? (
                  <p className="text-xs text-slate-600">
                    Ya registrado. Método: <b>{data.method ?? '—'}</b>
                  </p>
                ) : (
                  <form onSubmit={handleMarkPaid} className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">Método</label>
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value as PaymentMethod | '')}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">—</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="debito">Débito</option>
                        <option value="credito">Crédito</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="mercadopago">Mercado Pago (manual)</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700">
                        Notas / referencia
                      </label>
                      <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="N° boleta / transferencia"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {submitting ? 'Guardando…' : 'Marcar pagado'}
                    </button>
                  </form>
                )}
              </section>
            )}
          </div>
        </div>

        {/* Notas */}
        {(data.notes ?? '').trim() && (
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Notas
            </h2>
            <p className="text-xs text-slate-600 whitespace-pre-line">{data.notes}</p>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
