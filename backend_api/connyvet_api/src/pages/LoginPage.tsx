// src/pages/LoginPage.tsx
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../auth/AuthLayout';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorBanner(null);
    setFieldErrors({});

    const newFieldErrors: typeof fieldErrors = {};

    if (!email.trim()) {
      newFieldErrors.email = 'Ingresa tu correo electrónico institucional.';
    }
    if (!password.trim()) {
      newFieldErrors.password = 'Ingresa tu contraseña.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setErrorBanner('Revisa los campos marcados para continuar.');
      return;
    }

    try {
      setSubmitting(true);
      await login(email.trim(), password);

      // 👉 redirección al panel después de login correcto
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const apiFieldErrors: typeof fieldErrors = {};

      if (err?.errors) {
        if (err.errors.email?.[0]) {
          apiFieldErrors.email = err.errors.email[0];
        }
        if (err.errors.password?.[0]) {
          apiFieldErrors.password = err.errors.password[0];
        }
      }

      if (Object.keys(apiFieldErrors).length > 0) {
        setFieldErrors(apiFieldErrors);
      }

      setErrorBanner(
        err?.message ||
          'No se pudo iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Inicia sesión en ConnyVet"
      subtitle="Acceso interno para profesionales de la clínica: médicos, asistentes y administración."
      bottomText={
        <span className="text-[11px] text-slate-500">
          ¿Necesitas acceso? Pide a la administración de tu clínica que cree tu
          usuario y asigne tu rol.
        </span>
      }
    >
      {errorBanner && (
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorBanner}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Correo */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-700">
            Correo electrónico
          </label>
          <div className="relative">
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre.apellido@clinica.cl"
              className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                fieldErrors.email
                  ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                  : 'border-slate-300 bg-white'
              }`}
            />
          </div>
          {fieldErrors.email && (
            <p className="text-[11px] text-rose-500">{fieldErrors.email}</p>
          )}
        </div>

        {/* Contraseña */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-slate-700">
              Contraseña
            </label>
            <button
              type="button"
              className="text-[11px] font-medium text-emerald-700 hover:text-emerald-600"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full rounded-2xl border px-3 py-2.5 pr-24 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                fieldErrors.password
                  ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                  : 'border-slate-300 bg-white'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-2 my-1 flex items-center rounded-xl px-3 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-[11px] text-rose-500">{fieldErrors.password}</p>
          )}
        </div>

        {/* Opciones y contexto */}
        <div className="flex flex-col gap-2 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="remember" className="select-none">
              Mantener sesión iniciada en este equipo confiable
            </label>
          </div>
          <span className="italic">
            Entorno seguro · Fichas clínicas y datos de tutores protegidos
          </span>
        </div>

        {/* Botón principal */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Ingresando…' : 'Entrar al panel clínico'}
        </button>

        {/* Aviso legal / uso interno */}
        <p className="mt-1 text-[11px] leading-snug text-slate-500">
          Al iniciar sesión declaras que utilizas ConnyVet únicamente para fines
          clínicos y administrativos autorizados y te comprometes a resguardar
          la confidencialidad de la información de tutores y pacientes.
        </p>
      </form>
    </AuthLayout>
  );
}
