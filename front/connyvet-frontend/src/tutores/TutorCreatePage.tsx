import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { tutoresApi } from './api';
import type { TutorPayload } from './types';

interface ApiValidationErrors {
  [key: string]: string[] | undefined;
}

export function TutorCreatePage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState<{
    nombres: string;
    apellidos: string;
    rut: string;
    email: string;
    telefono_movil: string;
    telefono_fijo: string;
    direccion: string;
    notas: string;
  }>({
    nombres: '',
    apellidos: '',
    rut: '',
    email: '',
    telefono_movil: '',
    telefono_fijo: '',
    direccion: '',
    notas: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleChange<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);
    setFieldErrors({});

    const payload: TutorPayload = {
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim() || null,
      rut: form.rut.trim() || null,
      email: form.email.trim() || null,
      telefono_movil: form.telefono_movil.trim() || null,
      telefono_fijo: form.telefono_fijo.trim() || null,
      direccion: form.direccion.trim() || null,
      notas: form.notas.trim() || null,
      // si en tu backend tienes `activo` o `is_active`, puedes setearlo aquí
      // activo: true,
    };

    try {
      await tutoresApi.create(payload, token);
      navigate('/dashboard/tutores');
    } catch (err: any) {
      // Mismo patrón que usamos en pacientes
      if (err?.message === 'VALIDATION_ERROR' && err.validation) {
        const errors: ApiValidationErrors = err.validation;
        const mapped: Record<string, string> = {};
        Object.entries(errors).forEach(([key, messages]) => {
          if (messages && messages.length > 0) {
            mapped[key] = messages[0];
          }
        });
        setFieldErrors(mapped);
        setErrorBanner(
          err.messageApi ||
            'Revisa los campos marcados para continuar.',
        );
      } else {
        console.error('Error creando tutor:', err);
        setErrorBanner(
          err?.message || 'Ocurrió un error al crear el tutor.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Nuevo tutor">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Migas / header */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
            <Link
              to="/dashboard/tutores"
              className="hover:underline hover:text-slate-700"
            >
              Tutores
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">
              Nuevo tutor
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
          >
            Volver
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)]">
          {/* Form principal */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <header className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-900">
                Datos del tutor
              </h2>
              <p className="text-xs text-slate-500">
                Registra la información del responsable de los pacientes
                para poder asociar fichas, vacunas y recordatorios.
              </p>
            </header>

            {errorBanner && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {errorBanner}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombres / apellidos */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Nombres
                  </label>
                  <input
                    type="text"
                    value={form.nombres}
                    onChange={(e) =>
                      handleChange('nombres', e.target.value)
                    }
                    placeholder="Ej: Gonzalo Felipe"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.nombres
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.nombres && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.nombres}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    value={form.apellidos}
                    onChange={(e) =>
                      handleChange('apellidos', e.target.value)
                    }
                    placeholder="Ej: Pizarro Sáez"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.apellidos
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.apellidos && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.apellidos}
                    </p>
                  )}
                </div>
              </div>

              {/* RUT / email */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    RUT (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.rut}
                    onChange={(e) => handleChange('rut', e.target.value)}
                    placeholder="12.345.678-9"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.rut
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.rut && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.rut}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      handleChange('email', e.target.value)
                    }
                    placeholder="tutor@ejemplo.com"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.email
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Teléfonos */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Teléfono móvil (opcional)
                  </label>
                  <input
                    type="tel"
                    value={form.telefono_movil}
                    onChange={(e) =>
                      handleChange('telefono_movil', e.target.value)
                    }
                    placeholder="+56 9 1234 5678"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.telefono_movil
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.telefono_movil && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.telefono_movil}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Teléfono fijo (opcional)
                  </label>
                  <input
                    type="tel"
                    value={form.telefono_fijo}
                    onChange={(e) =>
                      handleChange('telefono_fijo', e.target.value)
                    }
                    placeholder="Ej: 2 2345 6789"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.telefono_fijo
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.telefono_fijo && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.telefono_fijo}
                    </p>
                  )}
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Dirección (opcional)
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) =>
                    handleChange('direccion', e.target.value)
                  }
                  placeholder="Calle, número, comuna"
                  className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    fieldErrors.direccion
                      ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                      : 'border-slate-300 bg-white'
                  }`}
                />
                {fieldErrors.direccion && (
                  <p className="text-[11px] text-rose-500">
                    {fieldErrors.direccion}
                  </p>
                )}
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Notas / comentarios (opcional)
                </label>
                <textarea
                  rows={3}
                  value={form.notas}
                  onChange={(e) =>
                    handleChange('notas', e.target.value)
                  }
                  placeholder="Antecedentes relevantes del tutor, preferencias de contacto, etc."
                  className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    fieldErrors.notas
                      ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                      : 'border-slate-300 bg-white'
                  }`}
                />
                {fieldErrors.notas && (
                  <p className="text-[11px] text-rose-500">
                    {fieldErrors.notas}
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="pt-3 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Guardando…' : 'Crear tutor'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard/tutores')}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>

          {/* Panel lateral */}
          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Buen registro de tutor
              </h3>
              <ul className="list-disc pl-4 text-slate-600 space-y-1">
                <li>
                  Usa correo y teléfono correctos para futuros recordatorios
                  de vacunas y controles.
                </li>
                <li>
                  El RUT ayuda a evitar duplicados y facilita
                  la facturación si lo agregas más adelante.
                </li>
                <li>
                  Dirección clara facilita visitas a domicilio
                  o envíos de documentación.
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
