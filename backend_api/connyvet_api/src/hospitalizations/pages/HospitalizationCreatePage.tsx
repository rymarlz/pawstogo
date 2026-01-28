// src/hospitalizations/pages/HospitalizationCreatePage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { createHospitalization } from '../api';
import type {
  HospitalizationStatus,
  HospitalizationFormValues,
} from '../types';
import { HospitalizationForm } from '../components/HospitalizationForm';

function getTodayDateInput(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function HospitalizationCreatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialValues: HospitalizationFormValues = {
    patient_id: '',
    tutor_id: '',
    admission_date: getTodayDateInput(),
    discharge_date: '',
    status: 'active' as HospitalizationStatus,
    bed_number: '',
    notes: '',
  };

  async function handleSubmit(values: HospitalizationFormValues) {
    if (!token) {
      setError('Sesión no válida. Inicia sesión nuevamente.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        patient_id: values.patient_id ? Number(values.patient_id) : undefined,
        tutor_id: values.tutor_id ? Number(values.tutor_id) : undefined,
        admission_date: values.admission_date || null,
        discharge_date: values.discharge_date || null,
        status: values.status as HospitalizationStatus,
        bed_number: values.bed_number || null,
        notes: values.notes || null,
      };

      await createHospitalization(token, payload);
      navigate('/dashboard/internaciones');
    } catch (err: any) {
      console.error('Error creando internación:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'No se pudo crear la internación.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Nueva internación / hospitalización">
      <section className="mb-4">
        <p className="max-w-2xl text-sm text-slate-600">
          Registra una nueva hospitalización para un paciente. Más adelante
          podrás vincular esta internación con la ficha clínica, tratamientos y
          controles de enfermería.
        </p>
      </section>

      {error && (
        <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <HospitalizationForm
        mode="create"
        initialValues={initialValues}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </DashboardLayout>
  );
}
