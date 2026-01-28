// src/hospitalizations/pages/HospitalizationEditPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import {
  getHospitalization,
  updateHospitalization,
} from '../api';
import type {
  Hospitalization,
  HospitalizationStatus,
  HospitalizationFormValues,
} from '../types';
import { HospitalizationForm } from '../components/HospitalizationForm';

function toInputDate(value?: string | null): string {
  if (!value) return '';
  // Asumimos que viene como ISO o "YYYY-MM-DD"
  return value.slice(0, 10);
}

export function HospitalizationEditPage() {
  const { token } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialValues, setInitialValues] =
    useState<HospitalizationFormValues | null>(null);

  useEffect(() => {
    async function load() {
      if (!token || !id) return;

      try {
        setLoading(true);
        setError(null);

        const hosp = (await getHospitalization(
          token,
          Number(id),
        )) as Hospitalization;

        const formValues: HospitalizationFormValues = {
          patient_id: hosp.patient_id ? String(hosp.patient_id) : '',
          tutor_id: hosp.tutor_id ? String(hosp.tutor_id) : '',
          admission_date: toInputDate(hosp.admission_date),
          discharge_date: toInputDate(hosp.discharge_date),
          status: hosp.status as HospitalizationStatus,
          bed_number: hosp.bed_number || '',
          notes: hosp.notes || '',
        };

        setInitialValues(formValues);
      } catch (err: any) {
        console.error('Error cargando internación:', err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'No se pudo cargar la internación.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, id]);

  async function handleSubmit(values: HospitalizationFormValues) {
    if (!token || !id) {
      setError('Sesión no válida o internación no encontrada.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: Partial<Hospitalization> = {
        patient_id: values.patient_id ? Number(values.patient_id) : undefined,
        tutor_id: values.tutor_id ? Number(values.tutor_id) : undefined,
        admission_date: values.admission_date || undefined,
        discharge_date: values.discharge_date || undefined,
        status: values.status as HospitalizationStatus,
        bed_number: values.bed_number || null,
        notes: values.notes || null,
      };

      await updateHospitalization(token, Number(id), payload);
      navigate('/dashboard/internaciones');
    } catch (err: any) {
      console.error('Error actualizando internación:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'No se pudo actualizar la internación.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Editar internación / hospitalización">
      <section className="mb-4">
        <p className="max-w-2xl text-sm text-slate-600">
          Modifica los datos de la hospitalización seleccionada. Los cambios se
          verán reflejados en la agenda de internación y en los resúmenes del
          paciente.
        </p>
      </section>

      {error && (
        <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-xs text-slate-500">Cargando internación...</p>
      )}

      {!loading && initialValues && (
        <HospitalizationForm
          mode="edit"
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </DashboardLayout>
  );
}
