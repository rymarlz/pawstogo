// src/pages/TutorEditPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { tutoresApi } from './api';
import type { Tutor } from './types';
import { TutorForm, type TutorFormValues } from './TutorForm';

export function TutorEditPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;

    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await tutoresApi.get(Number(id), token);
        if (!active) return;
        setTutor(data);
      } catch (err: any) {
        if (!active) return;
        setLoadError(
          err?.message || 'No se pudo cargar el tutor para edición.',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id, token]);

  async function handleSubmit(values: TutorFormValues) {
    if (!id || !token) return;

    try {
      setError(null);
      setSubmitting(true);
      const updated = await tutoresApi.update(Number(id), values, token);
      navigate(`/dashboard/tutores/${updated.id}`, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'No se pudieron guardar los cambios.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Editar tutor">
      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-6 text-sm text-slate-300">
          Cargando datos del tutor…
        </div>
      )}

      {loadError && !loading && (
        <div className="rounded-2xl border border-rose-700 bg-rose-950/60 px-4 py-3 text-xs text-rose-100">
          {loadError}
        </div>
      )}

      {!loading && !loadError && tutor && (
        <TutorForm
          mode="edit"
          initialData={tutor}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      )}

      {!loading && !loadError && !tutor && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-6 text-sm text-slate-300">
          No se encontró el tutor.
        </div>
      )}
    </DashboardLayout>
  );
}
