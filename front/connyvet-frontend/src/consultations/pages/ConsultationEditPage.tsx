// src/consultations/pages/ConsultationEditPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { apiFetch } from '../../api';
import {
  updateConsultation,
  uploadConsultationAttachments,
  deleteConsultationAttachment,
} from '../api';
import type { AttachmentDraft, ConsultationStatus } from '../types';
import { ConsultationForm, type ConsultationFormValues } from '../components/ConsultationForm';

function toLocalDateTimeInput(value?: string | null): string {
  if (!value) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}`;
  }

  // si backend manda "YYYY-MM-DD HH:mm:ss", intentar formatear sin romper
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return s.replace(' ', 'T').slice(0, 16);
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).replace(' ', 'T').slice(0, 16);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function ensureString(v: any): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

function ensureBool(v: any): boolean {
  return Boolean(v);
}

function ensureRx(v: any) {
  return {
    notes: ensureString(v?.notes),
    items: Array.isArray(v?.items) ? v.items : [],
  };
}

function ensureExamOrders(v: any) {
  return Array.isArray(v) ? v : [];
}

// ✅ Normalizador de adjuntos según el backend actual (attachments_meta)
function normalizeExistingAttachments(c: any): any[] {
  if (Array.isArray(c?.attachments_meta)) return c.attachments_meta;
  if (Array.isArray(c?.attachments)) return c.attachments;
  if (Array.isArray(c?.files)) return c.files;
  return [];
}

// ✅ Base URL para PDFs (debe apuntar a /api/v1)
function getApiBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');
}

export function ConsultationEditPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const consultationId = useMemo(() => Number(id), [id]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [apiError, setApiError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]> | null>(null);

  const [values, setValues] = useState<ConsultationFormValues | null>(null);

  // ✅ Adjuntos nuevos (archivo + detalle)
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);

  // ✅ Adjuntos existentes (para listar y eliminar visualmente)
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  async function loadConsultation(authToken: string) {
    setLoading(true);
    setApiError(null);

    try {
      const res: any = await apiFetch(`/consultations/${consultationId}`, { token: authToken });
      const c = res?.data ?? res;

      setExistingAttachments(normalizeExistingAttachments(c));

      const nextValues: ConsultationFormValues = {
        patient_id: c?.patient_id ?? null,
        tutor_id: c?.tutor_id ?? null,
        doctor_id: c?.doctor_id ?? null,

        date: toLocalDateTimeInput(c?.date),
        visit_type: ensureString(c?.visit_type),
        status: (c?.status ?? 'abierta') as ConsultationStatus,

        reason: ensureString(c?.reason),
        anamnesis: ensureString(c?.anamnesis),
        physical_exam: ensureString(c?.physical_exam),
        diagnosis_primary: ensureString(c?.diagnosis_primary),
        diagnosis_secondary: ensureString(c?.diagnosis_secondary),
        treatment: ensureString(c?.treatment),
        recommendations: ensureString(c?.recommendations),

        weight_kg: c?.weight_kg == null ? '' : String(c.weight_kg),
        temperature_c: c?.temperature_c == null ? '' : String(c.temperature_c),
        heart_rate: c?.heart_rate == null ? '' : String(c.heart_rate),
        respiratory_rate: c?.respiratory_rate == null ? '' : String(c.respiratory_rate),
        body_condition_score: c?.body_condition_score == null ? '' : String(c.body_condition_score),

        next_control_date: ensureString(c?.next_control_date),
        active: ensureBool(c?.active),

        prescription: ensureRx(c?.prescription),
        exam_orders: ensureExamOrders(c?.exam_orders),
      };

      setValues(nextValues);
    } catch (err: any) {
      setApiError(err?.message || 'No se pudo cargar la consulta.');
      setValues(null);
      setExistingAttachments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    if (!consultationId || Number.isNaN(consultationId)) return;
    void loadConsultation(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, consultationId]);

  /**
   * ✅ OJO: ConsultationForm ya te manda payload listo para API (Laravel-friendly).
   * Aquí NO re-armamos nada, solo:
   *  - update JSON
   *  - upload adjuntos
   */
  async function handleSubmit(payload: any) {
    if (!token) {
      setApiError('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }
    if (!consultationId || Number.isNaN(consultationId)) {
      setApiError('ID de consulta inválido.');
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

      // ✅ validar detalle obligatorio antes de subir
      const invalid = attachments.find((a) => !a.detail || !a.detail.trim());
      if (attachments.length > 0 && invalid) {
        setApiError('Cada adjunto debe tener un nombre/detalle antes de guardar.');
        return;
      }

      // 1) actualizar consulta (payload ya viene normalizado)
      await updateConsultation(token, consultationId, payload);

      // 2) subir adjuntos nuevos (si hay)
      if (attachments.length > 0) {
        const uploadRes: any = await uploadConsultationAttachments(token, consultationId, attachments);

        const uploaded = normalizeExistingAttachments(uploadRes?.data ?? uploadRes);

        // merge UI (evitar duplicados)
        setExistingAttachments((prev) => {
          const next = [...prev];
          for (const a of uploaded) {
            const key = a?.path || a?.url || `${a?.original_name}-${a?.uploaded_at}`;
            const exists = next.some((x) => (x?.path || x?.url) === key || x?.path === a?.path);
            if (!exists) next.push(a);
          }
          return next;
        });

        setAttachments([]);
      }

      // recargar para consistencia (receta/exámenes/adjuntos)
      await loadConsultation(token);

      navigate(`/dashboard/consultas/${consultationId}`);
    } catch (err: any) {
      // Laravel típico: { message, errors }
      if (err?.errors && typeof err.errors === 'object') {
        setValidationErrors(err.errors);
        setApiError(err?.message || 'Hay errores de validación.');
        return;
      }

      if (err?.message === 'VALIDATION_ERROR') {
        setValidationErrors(err.validation ?? null);
        setApiError(err.messageApi || 'Hay errores de validación.');
        return;
      }

      setApiError(err?.messageApi || err?.message || 'No se pudo guardar la consulta.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveExistingAttachment(index: number) {
    if (!token) return;

    // optimista UI
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index));

    try {
      const res = await deleteConsultationAttachment(token, consultationId, index);
      setExistingAttachments(res.attachments_meta ?? []);
    } catch (e) {
      // si falla, recargar desde backend
      await loadConsultation(token);
    }
  }

  const apiBase = getApiBaseUrl();
  const rxPdfUrl =
    token && consultationId
      ? `${apiBase}/consultations/${consultationId}/pdf/rx?token=${encodeURIComponent(token)}`
      : '#';
  const examsPdfUrl =
    token && consultationId
      ? `${apiBase}/consultations/${consultationId}/pdf/exams?token=${encodeURIComponent(token)}`
      : '#';
  const clinicalPdfUrl =
    token && consultationId
      ? `${apiBase}/consultations/${consultationId}/pdf/clinical?token=${encodeURIComponent(token)}`
      : '#';

  return (
    <DashboardLayout title="Editar consulta">
      <section className="card mb-4 text-xs">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Consultas</p>
        <h1 className="text-sm font-semibold text-slate-800">Editar consulta</h1>
        <p className="mt-1 text-[11px] text-slate-500">Modifica la consulta, receta, exámenes y adjuntos.</p>
      </section>

      {/* ✅ DESCARGAS (EDIT) */}
      {!loading && token && consultationId && (
        <section className="card mb-4 text-xs">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Descargas</p>
          <h2 className="text-sm font-semibold text-slate-800">PDF de la consulta</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Generados desde el backend. Se abren en una nueva pestaña.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <a className="btn" href={rxPdfUrl} target="_blank" rel="noreferrer">
              Receta (PDF)
            </a>

            <a className="btn" href={examsPdfUrl} target="_blank" rel="noreferrer">
              Exámenes (PDF)
            </a>

            <a className="btn-ghost" href={clinicalPdfUrl} target="_blank" rel="noreferrer">
              Ficha completa (PDF)
            </a>
          </div>
        </section>
      )}

      {loading && <section className="card text-xs text-slate-600">Cargando consulta…</section>}

      {!loading && values && (
        <ConsultationForm
          mode="edit"
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit} // ✅ payload listo
          submitting={submitting}
          apiError={apiError}
          validationErrors={validationErrors ?? undefined}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          existingAttachments={existingAttachments}
          onRemoveExistingAttachment={handleRemoveExistingAttachment} // ✅ delete real
        />
      )}

      {!loading && !values && (
        <section className="card text-xs text-rose-700">No se pudo cargar la consulta.</section>
      )}
    </DashboardLayout>
  );
}
