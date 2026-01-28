// src/consultations/pages/ConsultationCreatePage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { createConsultation } from '../api';
import { uploadConsultationAttachments } from '../attachmentsApi';
import type { AttachmentDraft, ConsultationStatus } from '../types';
import { ConsultationForm, type ConsultationFormValues } from '../components/ConsultationForm';

function nowLocalDateTimeInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export function ConsultationCreatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]> | null>(null);

  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);

  const [values, setValues] = useState<ConsultationFormValues>({
    patient_id: null,
    tutor_id: null,
    doctor_id: null,
    date: nowLocalDateTimeInput(),
    visit_type: '',
    status: 'abierta' as ConsultationStatus,
    reason: '',
    anamnesis: '',
    physical_exam: '',
    diagnosis_primary: '',
    diagnosis_secondary: '',
    treatment: '',
    recommendations: '',
    weight_kg: '',
    temperature_c: '',
    heart_rate: '',
    respiratory_rate: '',
    body_condition_score: '',
    next_control_date: '',
    active: true,
    prescription: { notes: '', items: [] },
    exam_orders: [],
  });

  /**
   * OJO: recibe payload listo para API (lo arma ConsultationForm)
   */
  async function handleSubmit(payload: any) {
    if (!token) {
      setApiError('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    setSubmitting(true);
    setApiError(null);
    setValidationErrors(null);

    try {
      if (!payload?.patient_id) {
        setApiError('Debes seleccionar un paciente.');
        return;
      }

      // Validar detalle obligatorio por adjunto
      const invalid = attachments.find((a) => !a.detail || !a.detail.trim());
      if (attachments.length > 0 && invalid) {
        setApiError('Cada adjunto debe tener un nombre/detalle antes de guardar.');
        return;
      }

      // 1) Crear consulta (JSON)
      const created = await createConsultation(token, payload);

      // 2) Subir adjuntos (FormData)
      if (attachments.length > 0) {
        console.log(
          '[CreatePage] attachments debug:',
          attachments.map((a: any, i: number) => ({
            i,
            isFile: a?.file instanceof File,
            ctor: a?.file?.constructor?.name,
            name: a?.file?.name,
            size: a?.file?.size,
            type: a?.file?.type,
            detail: a?.detail,
          })),
        );

        await uploadConsultationAttachments(token, created.id, attachments as any);
      }

      setAttachments([]);
      navigate(`/dashboard/consultas/${created.id}`);
    } catch (err: any) {
      // Laravel típico: { message, errors }
      if (err?.errors && typeof err.errors === 'object') {
        setValidationErrors(err.errors);
        setApiError(err?.message || 'Hay errores de validación.');
        return;
      }

      // Si tu apiFetch usa formato propio
      if (err?.message === 'VALIDATION_ERROR') {
        setValidationErrors(err.validation ?? null);
        setApiError(err.messageApi || 'Hay errores de validación.');
        return;
      }

      setApiError(err?.messageApi || err?.message || 'No se pudo crear la consulta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Nueva consulta">
      <section className="card mb-4 text-xs">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Consultas</p>
        <h1 className="text-sm font-semibold text-slate-800">Crear nueva consulta</h1>
        <p className="mt-1 text-[11px] text-slate-500">
          Crea la consulta e incluye receta, exámenes y adjuntos.
        </p>
      </section>

      <ConsultationForm
        mode="create"
        values={values}
        onChange={setValues}
        onSubmit={handleSubmit}
        submitting={submitting}
        apiError={apiError}
        validationErrors={validationErrors ?? undefined}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
      />
    </DashboardLayout>
  );
}
