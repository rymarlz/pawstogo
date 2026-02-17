// src/consultations/pages/ConsultationDetailPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { fetchConsultation } from '../api';
import type { Consultation } from '../types';
import { LABELS_CLINICAL } from '../../lib/labels';

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-CL');
}

function openWithToken(path: string, token: string) {
  const sep = path.includes('?') ? '&' : '?';
  window.open(`${path}${sep}token=${encodeURIComponent(token)}`, '_blank', 'noopener,noreferrer');
}

function fmtBytes(size?: number | null) {
  if (!size || Number.isNaN(size)) return '—';
  const kb = size / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function ConsultationDetailPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const id = params.id ? Number(params.id) : NaN;

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    if (!id || Number.isNaN(id)) {
      navigate('/dashboard/consultas');
      return;
    }

    async function load(authToken: string) {
      try {
        setLoading(true);
        setApiError(null);
        const c = await fetchConsultation(authToken, id);
        setConsultation(c);
      } catch (err: any) {
        setApiError(err?.message || 'No se pudo cargar la consulta.');
      } finally {
        setLoading(false);
      }
    }

    void load(token);
  }, [token, id, navigate]);

  const rxItems = useMemo(() => consultation?.prescription?.items ?? [], [consultation]);
  const exams = useMemo(() => consultation?.exam_orders ?? [], [consultation]);

  const hasRx = rxItems.length > 0 || Boolean(consultation?.prescription?.notes);
  const hasExams = (exams?.length ?? 0) > 0;

  // ✅ Adjuntos (lo leemos con fallback por si cambia el shape)
  const attachments = useMemo(() => {
    const raw: any[] =
      Array.isArray((consultation as any)?.attachments) ? (consultation as any).attachments :
      Array.isArray((consultation as any)?.files) ? (consultation as any).files :
      [];
    return raw;
  }, [consultation]);

  const hasAttachments = attachments.length > 0;

  function downloadPrescriptionPdf() {
    if (!token || !consultation?.id) return;
    openWithToken(`/api/v1/consultations/${consultation.id}/pdf/prescription`, token);
  }

  function downloadExamsPdf() {
    if (!token || !consultation?.id) return;
    openWithToken(`/api/v1/consultations/${consultation.id}/pdf/exams`, token);
  }

  function downloadCombinedPdf() {
    if (!token || !consultation?.id) return;
    openWithToken(`/api/v1/consultations/${consultation.id}/pdf/print`, token);
  }

  return (
    <DashboardLayout title="Detalle de consulta">
      {loading && <section className="card text-xs text-slate-600">Cargando…</section>}

      {apiError && !loading && (
        <section className="card text-xs text-rose-700 bg-rose-50 border-rose-200">
          {apiError}
        </section>
      )}

      {!loading && consultation && (
        <>
          {/* HEADER */}
          <section className="card mb-4 text-xs">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Consulta</p>
                <h1 className="text-sm font-semibold text-slate-800">Consulta #{consultation.id}</h1>
                <p className="mt-1 text-[11px] text-slate-500">
                  {consultation.patient?.name
                    ? `Paciente: ${consultation.patient.name}`
                    : `Paciente #${consultation.patient_id}`}{' '}
                  · {formatDateTime(consultation.date)}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => navigate(`/dashboard/consultas/${consultation.id}/editar`)}
                >
                  Editar
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={!hasRx}
                  onClick={downloadPrescriptionPdf}
                  title={!hasRx ? 'No hay datos de receta para imprimir' : 'Descargar receta PDF'}
                >
                  PDF Receta
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={!hasExams}
                  onClick={downloadExamsPdf}
                  title={!hasExams ? 'No hay exámenes para imprimir' : 'Descargar exámenes PDF'}
                >
                  PDF Exámenes
                </button>

                <button
                  type="button"
                  className="btn"
                  disabled={!hasRx && !hasExams}
                  onClick={downloadCombinedPdf}
                  title={!hasRx && !hasExams ? 'No hay receta/exámenes para imprimir' : 'PDF receta + exámenes'}
                >
                  PDF Completo
                </button>
              </div>
            </div>
          </section>

          {/* CONTENIDO: etiquetas alineadas a ficha clínica (Motivo, Anamnesis, Diagnóstico, Tratamiento, Recomendaciones) */}
          <section className="card text-xs space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{LABELS_CLINICAL.reason}</p>
              <p className="mt-1 text-sm text-slate-800">{consultation.reason || '—'}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-[11px] text-slate-500">{LABELS_CLINICAL.anamnesis}</p>
                <p className="text-[12px] text-slate-800 whitespace-pre-wrap">
                  {consultation.anamnesis || '—'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">{LABELS_CLINICAL.physicalExam}</p>
                <p className="text-[12px] text-slate-800 whitespace-pre-wrap">
                  {consultation.physical_exam || '—'}
                </p>
              </div>
            </div>

            {(consultation.diagnosis_primary || consultation.diagnosis_secondary) && (
              <div>
                <p className="text-[11px] text-slate-500">{LABELS_CLINICAL.diagnosis}</p>
                <p className="text-[12px] text-slate-800 whitespace-pre-wrap">
                  {[consultation.diagnosis_primary, consultation.diagnosis_secondary].filter(Boolean).join('\n')}
                </p>
              </div>
            )}

            {consultation.treatment && (
              <div>
                <p className="text-[11px] text-slate-500">{LABELS_CLINICAL.treatment}</p>
                <p className="text-[12px] text-slate-800 whitespace-pre-wrap">{consultation.treatment}</p>
              </div>
            )}

            {consultation.recommendations && (
              <div>
                <p className="text-[11px] text-slate-500">{LABELS_CLINICAL.recommendations}</p>
                <p className="text-[12px] text-slate-800 whitespace-pre-wrap">{consultation.recommendations}</p>
              </div>
            )}

            <hr className="border-slate-200" />

            {/* RECETA */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Receta</p>

              {rxItems.length === 0 ? (
                <p className="text-[12px] text-slate-600">Sin fármacos indicados.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[900px] w-full border-collapse text-xs">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-2 text-left">Fármaco</th>
                        <th className="px-3 py-2 text-left">Dosis</th>
                        <th className="px-3 py-2 text-left">Frecuencia</th>
                        <th className="px-3 py-2 text-left">Duración</th>
                        <th className="px-3 py-2 text-left">Vía</th>
                        <th className="px-3 py-2 text-left">Indicaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rxItems.map((it, idx) => (
                        <tr key={idx} className="border-b border-slate-200 last:border-b-0">
                          <td className="px-3 py-2 text-slate-800">{it.drug_name}</td>
                          <td className="px-3 py-2 text-slate-700">{it.dose || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{it.frequency || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{it.duration_days ?? '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{it.route || '—'}</td>
                          <td className="px-3 py-2 text-slate-700">{it.instructions || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {consultation.prescription?.notes ? (
                <p className="mt-2 text-[12px] text-slate-700">
                  <span className="font-medium">Notas:</span> {consultation.prescription.notes}
                </p>
              ) : null}
            </div>

            <hr className="border-slate-200" />

            {/* EXÁMENES */}
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Exámenes</p>

              {exams.length === 0 ? (
                <p className="text-[12px] text-slate-600">Sin exámenes solicitados.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[720px] w-full border-collapse text-xs">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-2 text-left">Examen</th>
                        <th className="px-3 py-2 text-left">Prioridad</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                        <th className="px-3 py-2 text-left">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.map((ex, idx) => (
                        <tr key={idx} className="border-b border-slate-200 last:border-b-0">
                          <td className="px-3 py-2 text-slate-800">{ex.exam_name}</td>
                          <td className="px-3 py-2 text-slate-700">{ex.priority || 'normal'}</td>
                          <td className="px-3 py-2 text-slate-700">{ex.status || 'requested'}</td>
                          <td className="px-3 py-2 text-slate-700">{ex.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ✅ ARCHIVOS ADJUNTOS */}
            <hr className="border-slate-200" />

            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Archivos adjuntos</p>

              {!hasAttachments ? (
                <p className="text-[12px] text-slate-600">Sin archivos adjuntos.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-[760px] w-full border-collapse text-xs">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="px-3 py-2 text-left">Nombre</th>
                        <th className="px-3 py-2 text-left">Archivo</th>
                        <th className="px-3 py-2 text-left">Tamaño</th>
                        <th className="px-3 py-2 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attachments.map((a: any, idx: number) => {
                        const label =
                          a?.name || a?.detail || a?.title || a?.label || a?.display_name ||
                          a?.original_name || a?.filename || `Archivo ${idx + 1}`;

                        const original =
                          a?.original_name || a?.filename || a?.file_name || a?.name || '—';

                        // si backend ya te manda URL lista:
                        const urlFromApi = a?.url || a?.download_url;

                        // si no, armamos una ruta estándar (ver backend abajo)
                        const urlFallback =
                          consultation?.id && a?.id
                            ? `/api/v1/consultations/${consultation.id}/attachments/${a.id}/download`
                            : '';

                        const openUrl = urlFromApi || urlFallback;

                        return (
                          <tr key={a?.id ?? idx} className="border-b border-slate-200 last:border-b-0">
                            <td className="px-3 py-2 text-slate-800">{label}</td>
                            <td className="px-3 py-2 text-slate-700">{original}</td>
                            <td className="px-3 py-2 text-slate-700">{fmtBytes(a?.size)}</td>
                            <td className="px-3 py-2 text-right">
                              {openUrl ? (
                                <button
                                  type="button"
                                  className="btn-ghost"
                                  style={{ fontSize: '11px', padding: '0.35rem 0.8rem' }}
                                  onClick={() => token && openWithToken(openUrl, token)}
                                >
                                  Abrir
                                </button>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
