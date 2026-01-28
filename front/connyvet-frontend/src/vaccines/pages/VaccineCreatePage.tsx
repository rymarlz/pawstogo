// src/vaccines/pages/VaccineCreatePage.tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { createVaccine } from '../api';
import {
  VaccineForm,
  createInitialVaccineFormValues,
  mapFormToPayload,
  type VaccineFormValues,
  type ApiValidationErrors,
} from '../components/VaccineForm';

export function VaccineCreatePage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState<VaccineFormValues>(
    createInitialVaccineFormValues,
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>(
    {},
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);
    setFieldErrors({});

    const payload = mapFormToPayload(form);

    try {
      await createVaccine(token, payload);
      navigate('/dashboard/catalogo-vacunas');
    } catch (err: any) {
      if (err?.validation) {
        const errors: ApiValidationErrors = err.validation;
        const mapped: Record<string, string> = {};
        Object.entries(errors).forEach(([key, messages]) => {
          if (messages && messages.length > 0) {
            mapped[key] = messages[0];
          }
        });
        setFieldErrors(mapped);
        setErrorBanner(
          err.messageApi || 'Revisa los campos marcados para continuar.',
        );
      } else {
        setErrorBanner(
          err?.message || 'Ocurrió un error al crear la vacuna.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Nueva vacuna">
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Migas */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
            <Link
              to="/dashboard/catalogo-vacunas"
              className="hover:underline hover:text-slate-700"
            >
              Catálogo de vacunas
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">
              Nueva vacuna
            </span>
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
            <h2 className="text-sm font-semibold text-slate-900">
              Registrar nueva vacuna
            </h2>
            <p className="text-xs text-slate-500">
              Define la vacuna en el catálogo: especie objetivo, vía de
              administración, edades y si es vacuna core.
            </p>
          </header>

          <VaccineForm
            mode="create"
            values={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            submitting={submitting}
            fieldErrors={fieldErrors}
            errorBanner={errorBanner}
          />
        </section>
      </div>
    </DashboardLayout>
  );
}
