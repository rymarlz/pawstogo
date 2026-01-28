// src/vaccines/pages/VaccineEditPage.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { fetchVaccine, updateVaccine } from '../api';
import type { Vaccine } from '../types';
import {
  VaccineForm,
  createInitialVaccineFormValues,
  mapPayloadToForm,
  mapFormToPayload,
  type VaccineFormValues,
  type ApiValidationErrors,
} from '../components/VaccineForm';

export function VaccineEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState<VaccineFormValues>(
    createInitialVaccineFormValues,
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      if (!token || !id) return;
      setLoading(true);
      setErrorBanner(null);

      try {
        const res = await fetchVaccine(token, Number(id));
        const v: Vaccine = res.data;
        setForm(mapPayloadToForm(v));
      } catch (err: any) {
        console.error('Error cargando vacuna:', err);
        const message =
          err?.messageApi ||
          err?.response?.data?.message ||
          err?.message ||
          'No se pudo cargar la vacuna.';
        setErrorBanner(message);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !id) return;

    setSubmitting(true);
    setErrorBanner(null);
    setFieldErrors({});

    const payload = mapFormToPayload(form);

    try {
      await updateVaccine(token, Number(id), payload);
      navigate('/dashboard/catalogo-vacunas');
    } catch (err: any) {
      console.error('Error actualizando vacuna:', err);

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
          err?.message || 'Ocurrió un error al actualizar la vacuna.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Editar vacuna">
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Migas */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
            <span>Vacunas</span>
            <span>/</span>
            <Link
              to="/dashboard/catalogo-vacunas"
              className="text-sky-600 hover:underline"
            >
              Catálogo
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">Editar vacuna</span>
          </div>
          <Link
            to="/dashboard/catalogo-vacunas"
            className="btn-ghost text-[11px]"
          >
            ← Volver al listado
          </Link>
        </div>

        {/* Errores */}
        {errorBanner && (
          <div className="card border border-rose-200 bg-rose-50 text-[11px] text-rose-700">
            {errorBanner}
          </div>
        )}

        {/* Formulario */}
        {loading ? (
          <div className="card text-xs text-slate-500">
            Cargando vacuna…
          </div>
        ) : (
          <VaccineForm
            mode="edit"
            values={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            submitting={submitting}
            fieldErrors={fieldErrors}
            errorBanner={errorBanner}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
