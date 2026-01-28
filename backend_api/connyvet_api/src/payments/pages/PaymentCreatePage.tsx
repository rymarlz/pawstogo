// src/payments/pages/PaymentCreatePage.tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { createPayment, type PaymentMethod } from '../api';
import { PatientPicker, type SelectedPatient } from '../components/PatientPicker';

export function PaymentCreatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [selected, setSelected] = useState<SelectedPatient>({
    patient_id: null,
    tutor_id: null,
    patient: null,
  });

  const [concept, setConcept] = useState('Atención veterinaria');
  const [amount, setAmount] = useState('0');
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token, navigate]);

  const amountInt = useMemo(() => {
    const n = Number(String(amount ?? '').replace(',', '.'));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }, [amount]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    const conceptClean = concept.trim();
    if (!selected.patient_id) {
      setErrorBanner('Debes seleccionar un paciente.');
      return;
    }
    if (!conceptClean) {
      setErrorBanner('El concepto es obligatorio.');
      return;
    }
    if (!amountInt || amountInt < 1) {
      setErrorBanner('El monto debe ser mayor a 0.');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);

    try {
      const res = await createPayment(token, {
        patient_id: selected.patient_id,
        tutor_id: selected.tutor_id ?? null,
        concept: conceptClean,
        amount: Math.trunc(amountInt),
        status: 'pending',
        method: method ? method : null,
        notes: notes.trim() || null,
      });

      navigate(`/dashboard/pagos/${res.data.id}`, {
        state: { flash: { type: 'success', message: 'Pago creado correctamente.' } },
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo crear el pago.';
      setErrorBanner(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Nuevo pago">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
            <Link to="/dashboard/pagos" className="hover:underline hover:text-slate-700">
              Pagos
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">Nuevo pago</span>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
          >
            Volver
          </button>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <header className="space-y-1">
            <h2 className="text-sm font-semibold text-slate-900">Crear pago</h2>
            <p className="text-xs text-slate-500">
              Selecciona paciente y registra el cobro. Se crea como <b>pendiente</b>.
              Luego lo marcas como pagado (manual) desde el detalle.
            </p>
          </header>

          {errorBanner && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {errorBanner}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {token && (
              <PatientPicker token={token} value={selected} onChange={setSelected} />
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Concepto <span className="text-rose-500">*</span>
                </label>
                <input
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ej: Consulta veterinaria"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Monto (CLP) <span className="text-rose-500">*</span>
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ej: 15000"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Método (opcional)
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                >
                  <option value="">—</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Notas (opcional)
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
                  placeholder="Ej: N° boleta / referencia"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 hover:bg-emerald-500 disabled:opacity-60"
              >
                {submitting ? 'Creando…' : 'Crear pago'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/dashboard/pagos')}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
