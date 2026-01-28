// src/admin/pages/AdminUserCreatePage.tsx
import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../../../layouts/DashboardLayout';
import { useAuth } from '../../../auth/AuthContext';
import type { UserRole } from '../types';

type UserRoleOption = {
  value: UserRole;
  label: string;
};

const ROLE_OPTIONS: UserRoleOption[] = [
  { value: 'admin', label: 'Administrador/a' },
  { value: 'doctor', label: 'Médico/a veterinario/a' },
  { value: 'asistente', label: 'Asistente / Técnico' },
  { value: 'tutor', label: 'Tutor' },
];

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? '/api/v1';
const RESOURCE_BASE = `${API_BASE_URL}/admin/users`;

interface ApiValidationErrors {
  [key: string]: string[] | undefined;
}

export function AdminUserCreatePage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    active: boolean;
    password: string;
    password_confirmation: string;
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'doctor',
    active: true,
    password: '',
    password_confirmation: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

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
    setSaveSuccess(false);

    try {
      const res = await fetch(RESOURCE_BASE, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          active: form.active,
          password: form.password,
          password_confirmation: form.password_confirmation,
        }),
      });

      if (!res.ok) {
        // validaciones Laravel
        if (res.status === 422) {
          let msg = 'Revisa los campos marcados para continuar.';
          try {
            const data = await res.json();
            const errors: ApiValidationErrors = data.errors || {};
            const mapped: Record<string, string> = {};

            Object.entries(errors).forEach(([key, messages]) => {
              if (messages && messages.length > 0) {
                mapped[key] = messages[0];
              }
            });

            setFieldErrors(mapped);
            if (data.message) {
              msg = data.message;
            }
          } catch {
            // ignore json error
          }
          setErrorBanner(msg);
          return;
        }

        let msg = 'Ocurrió un error al crear el usuario.';
        try {
          const data = await res.json();
          msg = data?.message ?? msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      // éxito
      setSaveSuccess(true);
      // espera un momento visual o navega directo:
      navigate('/dashboard/usuarios');
    } catch (err: any) {
      setErrorBanner(err?.message || 'Ocurrió un error al crear el usuario.');
    } finally {
      setSubmitting(false);
    }
  }

  const title = 'Nuevo usuario interno';

  return (
    <DashboardLayout title={title}>
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Migas / header contextual */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
            <Link
              to="/dashboard/usuarios"
              className="hover:underline hover:text-slate-700"
            >
              Usuarios
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">
              Nuevo usuario
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
          {/* Formulario principal */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <header className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-900">
                Datos del usuario
              </h2>
              <p className="text-xs text-slate-500">
                Crea una cuenta interna para tu equipo. Podrás cambiar su rol o
                desactivarla más adelante.
              </p>
            </header>

            {errorBanner && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {errorBanner}
              </div>
            )}

            {saveSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Usuario creado correctamente.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre / Email */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Nombre y apellido"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.name
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.name}
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
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="usuario@clinica.cl"
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

              {/* Teléfono / Rol */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Teléfono de contacto
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+56 9 1234 5678"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.phone
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Rol en la clínica
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      handleChange('role', e.target.value as UserRole)
                    }
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.role
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.role && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.role}
                    </p>
                  )}
                </div>
              </div>

              {/* Contraseña */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Contraseña inicial
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      handleChange('password', e.target.value)
                    }
                    placeholder="Mínimo 8 caracteres"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.password
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.password && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={form.password_confirmation}
                    onChange={(e) =>
                      handleChange('password_confirmation', e.target.value)
                    }
                    placeholder="Repite la contraseña"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.password_confirmation
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.password_confirmation && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.password_confirmation}
                    </p>
                  )}
                </div>
              </div>

              {/* Estado */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('active', !form.active)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                      form.active
                        ? 'border-emerald-400 bg-emerald-500'
                        : 'border-slate-300 bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.active ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-slate-700">
                    {form.active
                      ? 'Usuario activo desde la creación'
                      : 'Crear como desactivado (no podrá iniciar sesión aún)'}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              <div className="pt-3 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Creando…' : 'Crear usuario'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard/usuarios')}
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
                Buenas prácticas
              </h3>
              <ul className="list-disc pl-4 text-slate-600 space-y-1">
                <li>
                  Usa correos institucionales o de trabajo, no correos personales
                  de clientes.
                </li>
                <li>
                  Asigna el rol mínimo necesario para las tareas del usuario.
                </li>
                <li>
                  Recuérdales cambiar su contraseña en el primer inicio de sesión.
                </li>
              </ul>
            </section>

            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm text-xs space-y-3">
              <h3 className="text-sm font-semibold text-amber-900">
                Seguridad
              </h3>
              <p className="text-amber-900/80">
                La contraseña inicial debería ser temporal. Puedes combinarla con
                políticas internas para cambio obligatorio al primer acceso.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
