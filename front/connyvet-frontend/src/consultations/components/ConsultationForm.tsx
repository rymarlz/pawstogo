// src/consultations/components/ConsultationForm.tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiFetch } from '../../api';
import type {
  ConsultationStatus,
  ConsultationExamOrder,
  ConsultationPrescription,
  AttachmentDraft,
} from '../types';
import { useAuth } from '../../auth/AuthContext';
import { ConsultationExamOrdersForm } from './ConsultationExamOrdersForm';
import { ConsultationPrescriptionForm } from './ConsultationPrescriptionForm';

/**
 * ✅ Convierte "datetime-local" (YYYY-MM-DDTHH:mm) a
 * "YYYY-MM-DD HH:mm:ss" (Laravel)
 *
 * OJO: datetime-local ya está en hora local del navegador.
 * NO uses new Date(...) porque te mete Z/UTC y te cambia la hora.
 */
const toLaravelDateTime = (v: string) => {
  const s = String(v || '').trim();
  if (!s) return s;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
    return s.replace('T', ' ') + ':00';
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    return s;
  }

  if (s.includes('T')) return s.split('.')[0].replace('T', ' ');
  return s;
};

// ✅ helpers para evitar 422 por tipos
const toIntOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
};

const toNumberOrNull = (v: unknown): number | null => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const toTrim = (v: unknown): string => String(v ?? '').trim();

const mapStatusForApi = (s: ConsultationStatus): any => s;

/** Límites de listas en selects (sin paginación en UI). Mostrar aviso si hay muchos registros. */
const PATIENTS_PER_PAGE = 200;
const DOCTORS_PER_PAGE = 100;

export interface ConsultationFormValues {
  patient_id: number | null;
  tutor_id: number | null;
  doctor_id: number | null;

  date: string; // datetime-local
  visit_type: string;
  status: ConsultationStatus;

  reason: string;
  anamnesis: string;
  physical_exam: string;
  diagnosis_primary: string;
  diagnosis_secondary: string;
  treatment: string;
  recommendations: string;

  weight_kg: string;
  temperature_c: string;
  heart_rate: string;
  respiratory_rate: string;
  body_condition_score: string;

  next_control_date: string; // YYYY-MM-DD
  active: boolean;

  prescription: ConsultationPrescription;
  exam_orders: ConsultationExamOrder[];
}

interface PatientOption {
  id: number;
  name: string;
  species?: string | null;
  tutor_id?: number | null;
}

interface DoctorOption {
  id: number;
  name: string;
}

interface ConsultationFormProps {
  mode: 'create' | 'edit';
  values: ConsultationFormValues;
  onChange: (values: ConsultationFormValues) => void;

  /**
   * ✅ onSubmit recibe payload listo para API (JSON)
   * El contenedor se encarga de:
   *  - create/update consultation (JSON)
   *  - upload attachments (FormData) en una llamada aparte
   */
  onSubmit: (payload: any) => Promise<void>;

  submitting?: boolean;
  apiError?: string | null;
  validationErrors?: Record<string, string[]>;

  attachments: AttachmentDraft[];
  onAttachmentsChange: (items: AttachmentDraft[]) => void;

  existingAttachments?: any[];
  onRemoveExistingAttachment?: (index: number) => void;
}

function toDateInput(value?: string | null): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ensurePrescription(p: any): ConsultationPrescription {
  return {
    notes: p?.notes ?? '',
    items: Array.isArray(p?.items) ? p.items : [],
  };
}

function ensureExamOrders(x: any): ConsultationExamOrder[] {
  return Array.isArray(x) ? x : [];
}

function normalizeSort<T extends { sort_order?: number }>(rows: T[]) {
  return rows.map((r, i) => ({ ...r, sort_order: i }));
}

export function ConsultationForm(props: ConsultationFormProps) {
  const {
    mode,
    values,
    onChange,
    onSubmit,
    submitting = false,
    apiError,
    validationErrors,
    attachments = [],
    onAttachmentsChange,
    existingAttachments = [],
    onRemoveExistingAttachment,
  } = props;

  const { token, user } = useAuth();

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const rx = useMemo(() => ensurePrescription(values.prescription), [values.prescription]);
  const exams = useMemo(() => ensureExamOrders(values.exam_orders), [values.exam_orders]);

  // ✅ Si el usuario logueado es doctor, auto-asignar doctor_id si está vacío
  useEffect(() => {
    if (user?.role === 'doctor' && !values.doctor_id && user?.id) {
      onChange({ ...values, doctor_id: Number(user.id) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.id]);

  useEffect(() => {
    if (!token) return;

    async function loadOptions() {
      setLoadingOptions(true);
      try {
        const pRes: any = await apiFetch(`/patients?per_page=${PATIENTS_PER_PAGE}&active=true`, { token });

        const patientsRaw = Array.isArray(pRes?.data)
          ? pRes.data
          : Array.isArray(pRes?.items)
            ? pRes.items
            : [];

        const pOptions: PatientOption[] = patientsRaw.map((p: any) => ({
          id: p.id,
          tutor_id: p.tutor_id ?? p.tutor?.id ?? null,
          name:
            p.name +
            (p.species ? ` (${p.species})` : '') +
            (p.tutor_name ? ` · Tutor: ${p.tutor_name}` : ''),
          species: p.species,
        }));

        setPatients(pOptions);

        if (user?.role === 'admin' || user?.role === 'doctor') {
          const dRes: any = await apiFetch(`/admin/users?role=doctor&per_page=${DOCTORS_PER_PAGE}`, { token });

          const dRaw = Array.isArray(dRes?.data)
            ? dRes.data
            : Array.isArray(dRes?.items)
              ? dRes.items
              : [];

          const dOptions: DoctorOption[] = dRaw.map((u: any) => ({
            id: u.id,
            name: u.name || u.email || `Doctor #${u.id}`,
          }));

          setDoctors(dOptions);
        }
      } catch (err) {
        console.error('Error cargando opciones:', err);
      } finally {
        setLoadingOptions(false);
      }
    }

    void loadOptions();
  }, [token, user?.role]);

  function handleInputChange<K extends keyof ConsultationFormValues>(key: K, value: ConsultationFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  function handleCheckboxChange(key: keyof ConsultationFormValues) {
    const current = Boolean(values[key]);
    onChange({ ...values, [key]: (!current as any) });
  }

  function fieldError(name: string): string | null {
    if (!validationErrors) return null;
    const msg = validationErrors[name];
    if (!msg || msg.length === 0) return null;
    return msg[0];
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const temp = toNumberOrNull(values.temperature_c);
    const weight = toNumberOrNull(values.weight_kg);
    const hr = toNumberOrNull(values.heart_rate);
    const rr = toNumberOrNull(values.respiratory_rate);
    const bcs = toNumberOrNull(values.body_condition_score);

    // ✅ si no es válida, NO se envía (null)
    const safeTemp = temp != null && temp >= 20 ? temp : null;

    const payload: any = {
      ...values,

      patient_id: toIntOrNull(values.patient_id),
      tutor_id: toIntOrNull(values.tutor_id),
      doctor_id: toIntOrNull(values.doctor_id),

      date: toLaravelDateTime(values.date),

      visit_type: toTrim(values.visit_type) || null,
      reason: toTrim(values.reason) || null,
      anamnesis: toTrim(values.anamnesis) || null,
      physical_exam: toTrim(values.physical_exam) || null,
      diagnosis_primary: toTrim(values.diagnosis_primary) || null,
      diagnosis_secondary: toTrim(values.diagnosis_secondary) || null,
      treatment: toTrim(values.treatment) || null,
      recommendations: toTrim(values.recommendations) || null,

      status: mapStatusForApi(values.status),
      active: Boolean(values.active),

      weight_kg: weight,
      temperature_c: safeTemp,
      heart_rate: hr,
      respiratory_rate: rr,
      body_condition_score: bcs,

      next_control_date: toDateInput(values.next_control_date) || null,

      prescription: {
        notes: toTrim(rx.notes ?? '') || null,
        items: normalizeSort(rx.items ?? []),
      },
      exam_orders: normalizeSort(exams ?? []),
    };

    void onSubmit(payload);
  }

  // ====== ADJUNTOS handlers (solo state) ======
  function addSelectedFiles(fileList: File[]) {
    const drafts: AttachmentDraft[] = fileList.map((f) => ({
      file: f,
      detail: (f.name || '').replace(/\.[^.]+$/, ''),
    }));
    onAttachmentsChange([...attachments, ...drafts]);
  }

  function updateAttachmentDetail(index: number, detail: string) {
    const next = attachments.map((a, i) => (i === index ? { ...a, detail } : a));
    onAttachmentsChange(next);
  }

  function removeAttachmentDraft(index: number) {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  }

  function clearAttachmentDrafts() {
    onAttachmentsChange([]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Datos básicos */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between text-xs">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Datos básicos</p>
            <h2 className="text-sm font-semibold text-slate-800">Información principal de la consulta</h2>
          </div>
          {loadingOptions && <p className="text-[11px] text-slate-400">Cargando pacientes y doctores…</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2 text-xs">
          <div>
            <label className="mb-1 block font-medium text-slate-600">
              Paciente <span className="text-rose-500">*</span>
            </label>
            <select
              className="input"
              value={values.patient_id ?? ''}
              onChange={(e) => {
                const pid = e.target.value ? Number(e.target.value) : null;
                const selected = pid ? patients.find((p) => p.id === pid) : null;

                onChange({
                  ...values,
                  patient_id: pid,
                  tutor_id: selected?.tutor_id ?? null,
                });
              }}
              required
            >
              <option value="">Selecciona un paciente…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {fieldError('patient_id') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('patient_id')}</p>}
            {patients.length > 0 && (
              <p className="mt-1 text-[11px] text-gray-500">Mostrando los primeros {PATIENTS_PER_PAGE} pacientes.</p>
            )}
            {fieldError('tutor_id') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('tutor_id')}</p>}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-600">Médico responsable</label>
            <select
              className="input"
              value={values.doctor_id ?? ''}
              onChange={(e) => handleInputChange('doctor_id', e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Sin asignar</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {fieldError('doctor_id') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('doctor_id')}</p>}
            {doctors.length > 0 && (
              <p className="mt-1 text-[11px] text-gray-500">Mostrando los primeros {DOCTORS_PER_PAGE} doctores.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-600">
              Fecha y hora <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              className="input"
              value={values.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
            />
            {fieldError('date') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('date')}</p>}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-slate-600">Tipo de visita</label>
              <input
                type="text"
                className="input"
                placeholder="Primera vez, control, urgencia…"
                value={values.visit_type}
                onChange={(e) => handleInputChange('visit_type', e.target.value)}
              />
              {fieldError('visit_type') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('visit_type')}</p>}
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-600">Estado</label>
              <select
                className="input"
                value={values.status}
                onChange={(e) => handleInputChange('status', e.target.value as ConsultationStatus)}
              >
                <option value="abierta">Abierta</option>
                <option value="cerrada">Cerrada</option>
                <option value="anulada">Anulada</option>
              </select>
              {fieldError('status') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('status')}</p>}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[11px]">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={values.active}
              onChange={() => handleCheckboxChange('active')}
            />
            <span className="text-slate-600">Consulta activa en el historial clínico</span>
          </label>
        </div>
      </section>

      {/* Clínica */}
      <section className="card">
        <div className="mb-3 text-xs">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Clínica</p>
          <h2 className="text-sm font-semibold text-slate-800">Registro clínico</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 text-xs">
          <div>
            <label className="mb-1 block font-medium text-slate-600">Motivo de consulta</label>
            <textarea
              className="input min-h-[90px]"
              value={values.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder="Ej: decaimiento, vómitos, cojera..."
            />
            {fieldError('reason') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('reason')}</p>}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-600">Anamnesis</label>
            <textarea
              className="input min-h-[90px]"
              value={values.anamnesis}
              onChange={(e) => handleInputChange('anamnesis', e.target.value)}
              placeholder="Historia, tiempo de evolución, alimentación, vacunas, etc."
            />
            {fieldError('anamnesis') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('anamnesis')}</p>}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-600">Examen físico</label>
            <textarea
              className="input min-h-[90px]"
              value={values.physical_exam}
              onChange={(e) => handleInputChange('physical_exam', e.target.value)}
              placeholder="Hallazgos, mucosas, dolor, hidratación..."
            />
            {fieldError('physical_exam') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('physical_exam')}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-medium text-slate-600">Diagnóstico primario</label>
              <input
                className="input"
                value={values.diagnosis_primary}
                onChange={(e) => handleInputChange('diagnosis_primary', e.target.value)}
                placeholder="Dx principal"
              />
              {fieldError('diagnosis_primary') && (
                <p className="mt-1 text-[11px] text-rose-600">{fieldError('diagnosis_primary')}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block font-medium text-slate-600">Diagnóstico secundario</label>
              <input
                className="input"
                value={values.diagnosis_secondary}
                onChange={(e) => handleInputChange('diagnosis_secondary', e.target.value)}
                placeholder="Dx secundario"
              />
              {fieldError('diagnosis_secondary') && (
                <p className="mt-1 text-[11px] text-rose-600">{fieldError('diagnosis_secondary')}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block font-medium text-slate-600">Tratamiento</label>
              <textarea
                className="input min-h-[90px]"
                value={values.treatment}
                onChange={(e) => handleInputChange('treatment', e.target.value)}
                placeholder="Plan terapéutico, procedimientos, medicamentos (o deja para receta)..."
              />
              {fieldError('treatment') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('treatment')}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block font-medium text-slate-600">Recomendaciones</label>
              <textarea
                className="input min-h-[90px]"
                value={values.recommendations}
                onChange={(e) => handleInputChange('recommendations', e.target.value)}
                placeholder="Cuidados en casa, señales de alarma, dieta, reposo..."
              />
              {fieldError('recommendations') && (
                <p className="mt-1 text-[11px] text-rose-600">{fieldError('recommendations')}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Signos vitales */}
      <section className="card">
        <div className="mb-3 text-xs">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Signos vitales</p>
          <h2 className="text-sm font-semibold text-slate-800">Parámetros</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3 text-xs">
          <div>
            <label className="mb-1 block font-medium text-slate-600">Peso (kg)</label>
            <input
              className="input"
              inputMode="decimal"
              value={values.weight_kg}
              onChange={(e) => handleInputChange('weight_kg', e.target.value)}
              placeholder="Ej: 12.4"
            />
            {fieldError('weight_kg') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('weight_kg')}</p>}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-600">Temperatura (°C)</label>
            <input
              className="input"
              inputMode="decimal"
              value={values.temperature_c}
              onChange={(e) => handleInputChange('temperature_c', e.target.value)}
              placeholder="Ej: 38.6"
            />
            {fieldError('temperature_c') && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldError('temperature_c')}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-600">Frecuencia cardíaca</label>
            <input
              className="input"
              inputMode="numeric"
              value={values.heart_rate}
              onChange={(e) => handleInputChange('heart_rate', e.target.value)}
              placeholder="lpm"
            />
            {fieldError('heart_rate') && <p className="mt-1 text-[11px] text-rose-600">{fieldError('heart_rate')}</p>}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-600">Frecuencia respiratoria</label>
            <input
              className="input"
              inputMode="numeric"
              value={values.respiratory_rate}
              onChange={(e) => handleInputChange('respiratory_rate', e.target.value)}
              placeholder="rpm"
            />
            {fieldError('respiratory_rate') && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldError('respiratory_rate')}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-600">BCS (condición corporal)</label>
            <input
              className="input"
              inputMode="decimal"
              value={values.body_condition_score}
              onChange={(e) => handleInputChange('body_condition_score', e.target.value)}
              placeholder="Ej: 4.5"
            />
            {fieldError('body_condition_score') && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldError('body_condition_score')}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-medium text-slate-600">Próximo control</label>
            <input
              type="date"
              className="input"
              value={toDateInput(values.next_control_date)}
              onChange={(e) => handleInputChange('next_control_date', e.target.value)}
            />
            {fieldError('next_control_date') && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldError('next_control_date')}</p>
            )}
          </div>
        </div>
      </section>

      {/* ✅ Receta (tu componente real) */}
      <ConsultationPrescriptionForm
        value={rx}
        onChange={(next) => handleInputChange('prescription', next)}
      />

      {/* Archivos */}
      <section className="card">
        <div className="mb-3 text-xs">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Archivos</p>
          <h2 className="text-sm font-semibold text-slate-800">Adjuntar documentos</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Puedes adjuntar PDF, imágenes, documentos, etc.
            {mode === 'create' ? ' Se subirán al crear la consulta.' : ' Se subirán al guardar.'}
          </p>
        </div>

        {/* existentes */}
        {mode === 'edit' && Array.isArray(existingAttachments) && existingAttachments.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-slate-600 mb-2">Ya subidos</p>
            <div className="space-y-2">
              {existingAttachments.map((a: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs"
                >
                  <a className="text-sky-700 hover:underline" href={a.url} target="_blank" rel="noreferrer">
                    {(a.note?.trim() || a.name?.trim() || a.original_name || `Archivo ${idx + 1}`)}
                  </a>

                  {onRemoveExistingAttachment && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: '11px', padding: '0.35rem 0.8rem', color: '#b91c1c' }}
                      onClick={() => onRemoveExistingAttachment(idx)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* nuevos */}
        <div className="grid gap-3">
          <input
            type="file"
            multiple
            className="input"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt"
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []);
              if (list.length > 0) addSelectedFiles(list);
              e.currentTarget.value = '';
            }}
          />

          {attachments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">Seleccionados (agrega nombre por archivo):</p>

              <div className="space-y-2">
                {attachments.map((a, i) => (
                  <div
                    key={`${a.file.name}-${a.file.size}-${i}`}
                    className="rounded-xl border border-slate-200 p-3 text-xs"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="text-slate-700">
                        <p className="font-medium">{a.file.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {Math.round(a.file.size / 1024)} KB · {a.file.type || '—'}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ fontSize: '11px', padding: '0.35rem 0.8rem', color: '#b91c1c' }}
                        onClick={() => removeAttachmentDraft(i)}
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="mt-2">
                      <label className="mb-1 block font-medium text-slate-600">
                        Nombre / detalle <span className="text-rose-500">*</span>
                      </label>
                      <input
                        className="input"
                        placeholder="Ej: Examen de sangre, Radiografía tórax, Boleta..."
                        value={a.detail}
                        onChange={(ev) => updateAttachmentDetail(i, ev.target.value)}
                        required
                      />
                      {!a.detail?.trim() && (
                        <p className="mt-1 text-[11px] text-rose-600">
                          Debes ingresar un nombre/detalle para este archivo.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="btn-ghost" onClick={clearAttachmentDrafts}>
                Quitar todos
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Exámenes */}
      <ConsultationExamOrdersForm
        value={exams}
        onChange={(next) => handleInputChange('exam_orders', normalizeSort(next))}
      />

      {apiError && (
        <div className="card border border-rose-200 bg-rose-50 text-xs text-rose-800">
          {apiError}
        </div>
      )}

      <div className="flex justify-end gap-2 text-xs">
        <button type="submit" disabled={submitting} className="btn">
          {submitting
            ? mode === 'create'
              ? 'Creando consulta…'
              : 'Guardando cambios…'
            : mode === 'create'
              ? 'Crear consulta'
              : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
