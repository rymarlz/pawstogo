// src/payments/pages/PaymentCreatePage.tsx
// Creación profesional de pagos con flujo explicado
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { createPayment } from '../api';
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
        notes: notes.trim() || null,
      });

      const payment = res?.data ?? res;
      const flashMessage =
        (res as { message?: string })?.message ??
        'Pago creado. El link de pago se envió al tutor por correo.';

      if (payment?.id) {
        navigate(`/dashboard/pagos/${payment.id}`, {
          state: { flash: { type: 'success', message: flashMessage } },
        });
      } else {
        navigate('/dashboard/pagos', {
          state: { flash: { type: 'success', message: flashMessage } },
        });
      }
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setErrorBanner(
        e?.response?.data?.message || e?.message || 'No se pudo crear el pago.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Nuevo pago">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-xs text-slate-500">
          <Link to="/dashboard/pagos" className="hover:underline hover:text-slate-700">
            Pagos
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-700">Nuevo pago</span>
        </nav>

        {/* Explicación del flujo */}
        <section className="rounded-2xl border border-sky-200 bg-sky-50/50 px-5 py-4">
          <h2 className="text-sm font-semibold text-sky-900">
            ¿Cómo funciona?
          </h2>
          <ol className="mt-2 space-y-1 text-sm text-sky-800">
            <li>1. Selecciona el paciente y completa el monto.</li>
            <li>2. El sistema genera un link de pago seguro de Mercado Pago.</li>
            <li>3. Si el tutor tiene email, recibirá el link automáticamente.</li>
            <li>4. El tutor paga con tarjeta, transferencia o cuenta Mercado Pago.</li>
          </ol>
        </section>

        {/* Formulario */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Crear pago</h2>
            <p className="mt-1 text-sm text-slate-500">
              El link de Mercado Pago se enviará por correo al tutor (si tiene email configurado).
            </p>
          </header>

          {errorBanner && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorBanner}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {token && (
              <PatientPicker token={token} value={selected} onChange={setSelected} />
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Concepto <span className="text-rose-500">*</span>
                </label>
                <input
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Ej: Consulta veterinaria"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Monto (CLP) <span className="text-rose-500">*</span>
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Ej: 15000"
                />
                {amountInt > 0 && (
                  <p className="text-xs text-slate-500">
                    Total: {new Intl.NumberFormat('es-CL', {
                      style: 'currency',
                      currency: 'CLP',
                      maximumFractionDigits: 0,
                    }).format(amountInt)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Notas (opcional)
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900"
                placeholder="Ej: Consulta del 15/03"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl bg-[#009ee3] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#0088c7] disabled:opacity-60"
              >
                {submitting ? 'Creando…' : 'Crear pago y enviar link'}
              </button>
              <Link
                to="/dashboard/pagos"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      </div>
    </DashboardLayout>
  );
}
