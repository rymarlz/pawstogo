// src/pages/TutorDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { fetchPatients } from '../clinic/api';
import type { Patient } from '../clinic/types';
import { speciesDisplay } from '../lib/labels';
import { tutoresApi } from './api';
import type { Tutor } from './types';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export function TutorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      // Guard básico: id válido
      if (!id || Number.isNaN(Number(id))) {
        if (!active) return;
        setError('Identificador de tutor no válido.');
        setLoading(false);
        return;
      }

      // (extra) si por alguna razón no hay token
      if (!token) {
        if (!active) return;
        setError('Tu sesión ha expirado. Vuelve a iniciar sesión.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await tutoresApi.get(Number(id), token);
        if (!active) return;
        setTutor(data);
      } catch (err: any) {
        if (!active) return;
        setError(
          err?.message || 'No se pudo cargar la información del tutor.',
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

  useEffect(() => {
    if (!id || !token || Number.isNaN(Number(id))) return;

    const authToken = token;
    let active = true;

    async function loadPatients() {
      setPatientsLoading(true);
      setPatientsError(null);

      try {
        const res = await fetchPatients(authToken, {
          search: '',
          species: '',
          active: 'all',
          tutor_id: Number(id),
          page: 1,
          per_page: 100,
        });

        if (!active) return;
        setPatients(res.data ?? []);
      } catch (err: unknown) {
        if (!active) return;
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los pacientes del tutor.';
        setPatientsError(message);
      } finally {
        if (active) setPatientsLoading(false);
      }
    }

    loadPatients();

    return () => {
      active = false;
    };
  }, [id, token]);

  async function handleDelete() {
    if (!id || !token) return;

    const ok = window.confirm(
      '¿Eliminar este tutor? Si tiene pacientes asociados, la operación puede fallar. Esta acción no se puede deshacer.',
    );
    if (!ok) return;

    setDeleting(true);
    setError(null);

    try {
      await tutoresApi.delete(Number(id), token);
      navigate('/dashboard/tutores', { replace: true });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'No se pudo eliminar el tutor.';
      setError(message);
    } finally {
      setDeleting(false);
    }
  }

  const nombreCompleto = tutor
    ? [tutor.nombres, tutor.apellidos].filter(Boolean).join(' ')
    : '';

  return (
    <DashboardLayout title="Detalle de tutor">
      {/* Barra superior interna */}
      <div className="mb-4 card" style={{ padding: '0.75rem 1rem' }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard/tutores')}
              className="btn-ghost"
              style={{ fontSize: '12px', padding: '0.4rem 0.9rem' }}
            >
              ← Volver a tutores
            </button>
            <div>
              <p className="text-[11px] text-slate-500">Tutor</p>
              <h2 className="text-sm font-semibold text-slate-800">
                {nombreCompleto || '—'}
              </h2>
            </div>
          </div>

          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '0.4rem 0.9rem' }}
              onClick={() => navigate(`/dashboard/tutores/${id}/editar`)}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{
                fontSize: '11px',
                padding: '0.4rem 0.9rem',
                borderColor: '#fecaca',
                color: '#b91c1c',
              }}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>

      {/* Estados */}
      {loading && (
        <div className="card text-sm text-slate-600">
          Cargando información del tutor…
        </div>
      )}

      {error && !loading && (
        <div
          className="card text-xs mb-4"
          style={{
            borderColor: '#f97373',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && tutor && (
        <div className="space-y-6">
          {/* Identidad + contacto principal */}
          <section className="grid gap-4 md:grid-cols-[1.4fr,1fr]">
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">
                Datos principales
              </h3>

              <div className="flex items-start gap-3">
                <div
                  style={{
                    height: '2.5rem',
                    width: '2.5rem',
                    borderRadius: '0.9rem',
                    backgroundColor: '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#0369a1',
                  }}
                >
                  {(tutor.nombres ?? '?')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase())
                    .join('')}
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-slate-800 font-medium">
                    {nombreCompleto || 'Sin nombre registrado'}
                  </p>
                  {tutor.rut && (
                    <p className="text-xs text-slate-500">
                      RUT: {tutor.rut}
                    </p>
                  )}
                  {tutor.fecha_nacimiento && (
                    <p className="text-xs text-slate-500">
                      Fecha de nacimiento: {tutor.fecha_nacimiento}
                    </p>
                  )}
                  {(tutor.estado_civil || tutor.ocupacion) && (
                    <p className="text-xs text-slate-500">
                      {tutor.estado_civil && (
                        <span>Estado civil: {tutor.estado_civil}</span>
                      )}
                      {tutor.estado_civil && tutor.ocupacion && (
                        <span> · </span>
                      )}
                      {tutor.ocupacion && (
                        <span>Ocupación: {tutor.ocupacion}</span>
                      )}
                    </p>
                  )}
                  {tutor.nacionalidad && (
                    <p className="text-xs text-slate-500">
                      Nacionalidad: {tutor.nacionalidad}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">
                Contacto
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Correo</p>
                  <p className="text-slate-800">
                    {tutor.email || 'No registrado'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      Teléfono móvil
                    </p>
                    <p className="text-slate-800">
                      {tutor.telefono_movil || 'No registrado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">
                      Teléfono fijo
                    </p>
                    <p className="text-slate-800">
                      {tutor.telefono_fijo || 'No registrado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Dirección y perfil */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">
                Dirección
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Dirección</p>
                  <p className="text-slate-800">
                    {tutor.direccion || 'No registrada'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Comuna</p>
                    <p className="text-slate-800">
                      {tutor.comuna || 'No registrada'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Región</p>
                    <p className="text-slate-800">
                      {tutor.region || 'No registrada'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">
                Perfil
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Comentarios</p>
                  <p className="text-slate-800 whitespace-pre-line">
                    {tutor.comentarios || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    Comentarios generales
                  </p>
                  <p className="text-slate-800 whitespace-pre-line">
                    {tutor.comentarios_generales || '—'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Información bancaria */}
          <section className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">
                Información bancaria
              </h3>
              <p className="text-[11px] text-slate-500">
                Datos opcionales para pagos y reembolsos.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500">Banco</p>
                  <p className="text-slate-800">
                    {tutor.banco || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    Tipo de cuenta
                  </p>
                  <p className="text-slate-800">
                    {tutor.tipo_cuenta || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    Número de cuenta
                  </p>
                  <p className="text-slate-800">
                    {tutor.numero_cuenta || '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500">
                    Titular de la cuenta
                  </p>
                  <p className="text-slate-800">
                    {tutor.titular_cuenta || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    RUT titular
                  </p>
                  <p className="text-slate-800">
                    {tutor.rut_titular || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    Alias transferencia
                  </p>
                  <p className="text-slate-800">
                    {tutor.alias_transferencia || '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500">
                    Correo para pagos
                  </p>
                  <p className="text-slate-800">
                    {tutor.email_para_pagos || tutor.email || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    Teléfono banco
                  </p>
                  <p className="text-slate-800">
                    {tutor.telefono_banco || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    Ejecutivo / sucursal
                  </p>
                  <p className="text-slate-800">
                    {tutor.ejecutivo || tutor.sucursal
                      ? `${tutor.ejecutivo ?? ''}${
                          tutor.ejecutivo && tutor.sucursal ? ' · ' : ''
                        }${tutor.sucursal ?? ''}`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Pacientes asociados */}
          <section className="card">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Pacientes asociados
                </h3>
                <p className="text-[11px] text-slate-500">
                  Mascotas registradas bajo este tutor.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(`/dashboard/pacientes/nuevo?tutor_id=${tutor.id}`)
                }
                className="btn-primary"
                style={{ fontSize: '11px', padding: '0.4rem 0.9rem' }}
              >
                + Nuevo paciente
              </button>
            </div>

            {patientsLoading && (
              <p className="text-sm text-slate-500">
                Cargando pacientes…
              </p>
            )}

            {patientsError && !patientsLoading && (
              <div
                className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
              >
                {patientsError}
              </div>
            )}

            {!patientsLoading && !patientsError && patients.length === 0 && (
              <div
                className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500"
              >
                Este tutor aún no tiene pacientes registrados.
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/dashboard/pacientes/nuevo?tutor_id=${tutor.id}`)
                    }
                    className="btn-secondary"
                    style={{ fontSize: '11px' }}
                  >
                    Registrar primer paciente
                  </button>
                </div>
              </div>
            )}

            {!patientsLoading && patients.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-3 py-2 text-left font-medium">Ficha</th>
                      <th className="px-3 py-2 text-left font-medium">Paciente</th>
                      <th className="px-3 py-2 text-left font-medium">Especie / raza</th>
                      <th className="px-3 py-2 text-left font-medium">Nacimiento</th>
                      <th className="px-3 py-2 text-left font-medium">Estado</th>
                      <th className="px-3 py-2 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => {
                      const p = patient as Patient & {
                        file_number?: number;
                        species_display?: string;
                      };
                      const fileNum = p.file_number ?? p.id;
                      const especie = speciesDisplay(
                        p.species,
                        p.species_display,
                      );
                      const raza = p.breed?.trim() || '—';

                      return (
                        <tr
                          key={p.id}
                          className="border-b border-slate-100 hover:bg-slate-50/60"
                        >
                          <td className="px-3 py-2 align-top text-slate-600">
                            #{fileNum}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <span className="font-medium text-slate-800">
                              {p.name || 'Sin nombre'}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top text-slate-700">
                            <div>{especie}</div>
                            <div className="text-[11px] text-slate-500">
                              {raza}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-slate-700">
                            {formatDate(p.birth_date)}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${
                                p.active
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-slate-100 text-slate-600'
                              }`}
                            >
                              {p.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-col items-end gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/dashboard/fichas/${p.id}`)
                                }
                                className="btn-primary"
                                style={{
                                  fontSize: '11px',
                                  padding: '0.35rem 0.7rem',
                                }}
                              >
                                Ver ficha
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/dashboard/pacientes/${p.id}`)
                                }
                                className="btn-ghost"
                                style={{
                                  fontSize: '11px',
                                  padding: '0.35rem 0.7rem',
                                }}
                              >
                                Ver paciente
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {!loading && !error && !tutor && (
        <div className="card text-center text-sm text-slate-500">
          No se encontró el tutor solicitado.
        </div>
      )}
    </DashboardLayout>
  );
}
