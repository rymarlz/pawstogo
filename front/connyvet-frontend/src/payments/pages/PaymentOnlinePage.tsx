// src/payments/pages/PaymentOnlinePage.tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { PatientPicker, type SelectedPatient } from '../components/PatientPicker';
import {
  createPaymentIntent,
  startPaymentIntent,
  type PaymentIntent,
} from '../paymentIntentsApi';

/**
 * Página para iniciar un pago online con Mercado Pago.
 * Crea una intención de pago (draft), la inicia con provider mercadopago
 * y redirige al usuario al checkout de Mercado Pago.
 */
export function PaymentOnlinePage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [selected, setSelected] = useState<SelectedPatient>({
    patient_id: null,
    tutor_id: null,
    patient: null,
  });

  const [title, setTitle] = useState('Pago veterinario');
  const [description, setDescription] = useState('');
  const [amountPesos, setAmountPesos] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token, navigate]);

  const amountNum = useMemo(() => {
    const s = String(amountPesos ?? '').replace(',', '.').trim();
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [amountPesos]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (amountNum < 1) {
      setErrorBanner('El monto debe ser mayor a 0 (en pesos).');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);

    try {
      // amount_total en backend está en centavos
      const amountTotalCentavos = Math.round(amountNum * 100);

      const createRes = await createPaymentIntent(token, {
        patient_id: selected.patient_id ?? null,
        tutor_id: selected.tutor_id ?? null,
        amount_total: amountTotalCentavos,
        currency: 'CLP',
        title: title.trim() || 'Pago veterinario',
        description: description.trim() || null,
      });

      const intent: PaymentIntent = createRes.data;
      if (intent.status === 'paid') {
        navigate(`/dashboard/pagos/intento/${intent.id}`, {
          state: { fromOnline: true },
        });
        return;
      }

      const startRes = await startPaymentIntent(token, intent.id, {
        provider: 'mercadopago',
      });

      const tx = startRes.transaction;
      const redirectUrl =
        tx?.redirect_url ??
        (tx as any)?.response_payload?.checkout_url ??
        (tx as any)?.response_payload?.sandbox_init_point ??
        (tx as any)?.response_payload?.init_point;

      if (redirectUrl && typeof redirectUrl === 'string' && redirectUrl.startsWith('http')) {
        window.location.href = redirectUrl;
        return;
      }

      setErrorBanner(
        'No se obtuvo el enlace de pago. Verifica MERCADOPAGO_ACCESS_TOKEN y MERCADOPAGO_ENVIRONMENT en el backend.'
      );
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { message?: string }; status?: number };
        message?: string;
      };
      const message =
        apiErr?.response?.data?.message ||
        apiErr?.message ||
        'No se pudo iniciar el pago. Intenta de nuevo.';
      setErrorBanner(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Pago con Mercado Pago">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex items-center gap-1 text-xs text-slate-500">
            <Link to="/dashboard/pagos" className="hover:underline hover:text-slate-700">
              Pagos
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-700">Pago online</span>
          </nav>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-ghost text-xs"
          >
            Volver
          </button>
        </div>

        <section className="card space-y-4">
          <header>
            <h2 className="text-sm font-semibold text-slate-900">Pago con Mercado Pago</h2>
            <p className="mt-1 text-xs text-slate-500">
              Completa los datos y serás redirigido al checkout seguro de Mercado Pago.
            </p>
          </header>

          {errorBanner && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {errorBanner}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {token && (
              <PatientPicker token={token} value={selected} onChange={setSelected} />
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Título del pago
              </label>
              <input
                type="text"
                className="input w-full"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej. Consulta veterinaria"
                maxLength={255}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Descripción (opcional)
              </label>
              <input
                type="text"
                className="input w-full"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ej. Consulta 15/03/2025"
                maxLength={500}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Monto (pesos CLP) *
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="input w-full"
                value={amountPesos}
                onChange={e => setAmountPesos(e.target.value)}
                placeholder="Ej. 25000"
                required
              />
              {amountNum > 0 && (
                <p className="mt-1 text-[11px] text-slate-400">
                  Total: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amountNum)}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting || amountNum < 1}
                className="btn-accent"
              >
                {submitting ? 'Preparando…' : 'Continuar a Mercado Pago'}
              </button>
              <Link to="/dashboard/pagos" className="btn-ghost">
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
