import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../../../layouts/DashboardLayout';
import { useAuth } from '../../../auth/AuthContext';
import type { AdminUser, UserRole } from '../types';

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

export function AdminUserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    active: boolean;
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'doctor',
    active: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  // helpers
  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // cargar usuario
  useEffect(() => {
    if (!id) {
      setLoadError('ID de usuario no válido.');
      setLoading(false);
      return;
    }
    if (!token) {
      setLoadError('Sesión no válida. Vuelve a iniciar sesión.');
      setLoading(false);
      return;
    }

    async function fetchUser() {
      try {
        setLoading(true);
        setLoadError(null);

        // 👈 OJO: usamos /admin/users/:id
        const res = await fetch(`${RESOURCE_BASE}/${id}`, {
          headers: authHeaders(),
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Usuario no encontrado o ya no existe.');
          }
          let msg = 'No se pudo cargar la información del usuario.';
          try {
            const data = await res.json();
            msg = data?.message ?? msg;
          } catch {
            // ignore json error
          }
          throw new Error(msg);
        }

        const data = await res.json();
        // asume que el backend responde { data: {...} } o { user: {...} } o directamente el usuario
        const u: AdminUser = (data.data ?? data.user ?? data) as AdminUser;

        setUser(u);
        setForm({
          name: u.name ?? '',
          email: u.email ?? '',
          phone: (u.phone as string | undefined) ?? '',
          role: u.role ?? 'doctor',
          active: u.active ?? true,
        });
      } catch (err: any) {
        setLoadError(err?.message || 'Error al cargar el usuario.');
      } finally {
        setLoading(false);
      }
    }

    void fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

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
    if (!id || !token) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setFieldErrors({});

    try {
      const res = await fetch(`${RESOURCE_BASE}/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          active: form.active,
        }),
      });

      if (!res.ok) {
        if (res.status === 422) {
          const data = await res.json();
          const errors: ApiValidationErrors = data.errors || {};
          const mapped: Record<string, string> = {};

          Object.entries(errors).forEach(([key, messages]) => {
            if (messages && messages.length > 0) {
              mapped[key] = messages[0];
            }
          });

          setFieldErrors(mapped);
          setSaveError('Revisa los campos marcados para continuar.');
          return;
        }

        let msg = 'No se pudo guardar los cambios del usuario.';
        try {
          const data = await res.json();
          msg = data?.message ?? msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const updated = await res.json();
      const updatedUser: AdminUser = (updated.data ?? updated.user ?? updated) as AdminUser;

      setUser(updatedUser);
      setForm({
        name: updatedUser.name ?? form.name,
        email: updatedUser.email ?? form.email,
        phone: (updatedUser.phone as string | undefined) ?? form.phone,
        role: updatedUser.role ?? form.role,
        active: updatedUser.active ?? form.active,
      });

      setSaveSuccess(true);
      // si quieres redirigir al listado:
      // navigate('/dashboard/usuarios');
    } catch (err: any) {
      setSaveError(err?.message || 'Error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  }

  const title = user ? `Editar usuario: ${user.name}` : 'Editar usuario';

  return (
    <DashboardLayout title={title}>
      <div className="space-y-4">
        {/* migas / header */}
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
              {user?.name ?? 'Editar'}
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

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Cargando información del usuario…
          </div>
        )}

        {loadError && !loading && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}

        {!loading && !loadError && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
            {/* formulario principal */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <header className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Datos principales
                  </h2>
                  <p className="text-xs text-slate-500">
                    Edita la información básica del usuario y su rol dentro de la clínica.
                  </p>
                </div>

                {user && (
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${
                        form.active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      {form.active ? 'Activo' : 'Desactivado'}
                    </span>
                    <span className="text-slate-400">
                      ID:{' '}
                      <span className="font-mono text-[11px]">
                        {user.id}
                      </span>
                    </span>
                  </div>
                )}
              </header>

              {saveError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Cambios guardados correctamente.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* nombre */}
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

                  {/* email */}
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

                <div className="grid gap-4 md:grid-cols-2">
                  {/* teléfono */}
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

                  {/* rol */}
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

                {/* estado */}
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
                        ? 'Usuario activo en el sistema'
                        : 'Usuario desactivado (no puede iniciar sesión)'}
                    </span>
                  </div>
                </div>

                {/* acciones */}
                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Guardando…' : 'Guardar cambios'}
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

            {/* panel lateral */}
            <aside className="space-y-4">
              <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Seguridad y acceso
                </h3>
                <p className="text-slate-600">
                  Desde aquí controlas quién puede ingresar al sistema y qué permisos tiene.
                  Cambiar el rol afecta qué módulos ve en el panel.
                </p>
                <ul className="list-disc pl-4 text-slate-500 space-y-1">
                  <li>El rol define acceso a módulos de clínica y administración.</li>
                  <li>Estado “Desactivado” bloquea el inicio de sesión.</li>
                  <li>El correo se usa como credencial principal de acceso.</li>
                </ul>
              </section>

              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm text-xs space-y-3">
                <h3 className="text-sm font-semibold text-amber-900">
                  Acciones sensibles
                </h3>
                <p className="text-amber-900/80">
                  Usa estas acciones con cuidado. Pueden afectar el acceso del usuario.
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-amber-300 bg-white px-3 py-2 text-[11px] font-medium text-amber-900 hover:bg-amber-100"
                    // onClick={...} // implementar: enviar link de cambio de contraseña
                  >
                    Enviar enlace para actualizar contraseña
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-rose-300 bg-white px-3 py-2 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
                    // onClick={...} // implementar: cerrar sesiones activas
                  >
                    Cerrar todas las sesiones activas
                  </button>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
