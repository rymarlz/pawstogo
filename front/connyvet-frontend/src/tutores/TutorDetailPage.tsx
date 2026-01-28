// src/pages/TutorDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { tutoresApi } from './api';
import type { Tutor } from './types';

export function TutorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
              // onClick={() => navigate(`/dashboard/tutores/${id}/editar`)}
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
              // onClick={handleDelete}  ← lo implementaremos cuando hagamos delete
            >
              Eliminar
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

          {/* Placeholder de pacientes del tutor */}
          <section className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Pacientes asociados
              </h3>
              <p className="text-[11px] text-slate-500">
                Este módulo se conectará con el registro de pacientes.
              </p>
            </div>
            <div
              style={{
                borderRadius: '1rem',
                border: '1px dashed #cbd5f5',
                padding: '1.5rem',
                fontSize: '0.75rem',
                color: '#64748b',
              }}
            >
              Aquí se mostrarán los pacientes vinculados a este tutor
              (nombre de la mascota, especie, edad, estado, próximas
              vacunas, etc.). Lo implementaremos una vez definamos el
              modelo de pacientes.
            </div>
            <div className="mt-3 text-[11px] text-slate-500">
              Más adelante podrás crear pacientes directamente desde
              esta vista y acceder a sus fichas clínicas.
            </div>
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
