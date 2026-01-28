// src/payments/pages/PaymentEditPage.tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { getPayment, updatePayment, type Payment, type PaymentMethod, type PaymentStatus } from '../api';


export function PaymentEditPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const id = params.id ? Number(params.id) : NaN;

  const [data, setData] = useState<Payment | null>(null);

  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // ✅ Narrow del token para que TS no moleste
  const authToken = token ?? '';

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!id || Number.isNaN(id)) {
      navigate('/dashboard/pagos');
      return;
    }

    async function load() {
      setLoading(true);
      setErrorBanner(null);
      try {
        // ✅ aquí token ya es string (porque arriba retornamos si no existe)
        const res = await getPayment(authToken, id);
        const p = res.data;

        setData(p);
        setConcept(p.concept ?? '');
        setAmount(String(p.amount ?? ''));
        setStatus(p.status ?? 'pending');
        setMethod((p.method ?? '') as any);
        setNotes(p.notes ?? '');
      } catch (err: any) {
        setErrorBanner(err?.message || 'No se pudo cargar el pago.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, authToken, id, navigate]);

  const amountInt = useMemo(() => {
    const n = Number(String(amount ?? '').replace(',', '.'));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }, [amount]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !data) return;

    const conceptClean = concept.trim();
    if (!conceptClean) {
      setErrorBanner('El concepto es obligatorio.');
      return;
    }
    if (Number.isNaN(amountInt) || amountInt < 0) {
      setErrorBanner('Monto inválido.');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);

    try {
      const res = await updatePayment(authToken, data.id, {
        concept: conceptClean,
        amount: Math.trunc(amountInt),
        status,
        method: method ? method : null,
        notes: notes.trim() || null,
      });

      navigate(`/dashboard/pagos/${res.data.id}`, {
        state: { flash: { type: 'success', message: 'Pago actualizado.' } },
      });
    } catch (err: any) {
      setErrorBanner(err?.message || 'No se pudo actualizar el pago.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Editar pago">
      {loading && (
        <section className="card text-xs text-slate-600">Cargando…</section>
      )}

      {!loading && errorBanner && (
        <section className="card text-xs text-rose-700 bg-rose-50 border-rose-200">
          {errorBanner}
        </section>
      )}

      {!loading && !errorBanner && data && (
        <div className="space-y-4">
          <section className="card text-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Pagos
              </p>
              <h1 className="text-sm font-semibold text-slate-800">
                Editar pago #{data.id}
              </h1>
              <p className="mt-1 text-[11px] text-slate-500">
                Paciente:{' '}
                <span className="font-medium">#{data.patient_id}</span>
              </p>
            </div>

            <Link
              to={`/dashboard/pagos/${data.id}`}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
            >
              Volver
            </Link>
          </section>

          <section className="card text-xs">
            <form
              onSubmit={handleSubmit}
              className="grid gap-3 md:grid-cols-2"
            >
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-medium text-slate-700">
                  Concepto <span className="text-rose-500">*</span>
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  value={concept}
                  onChange={e => setConcept(e.target.value)}
                  placeholder="Ej: Consulta veterinaria"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Monto (CLP) <span className="text-rose-500">*</span>
                </label>
                <input
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Ej: 15000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Estado
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  value={status}
                  onChange={e => setStatus(e.target.value as PaymentStatus)}
                >
                  <option value="pending">Pendiente</option>
                  <option value="paid">Pagado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Método
                </label>
                <select
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  value={method}
                  onChange={e => setMethod(e.target.value as any)}
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
                  Notas
                </label>
                <textarea
                  className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Observación / referencia / etc."
                />
              </div>

              <div className="md:col-span-2 flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {submitting ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
