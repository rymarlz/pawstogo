import { useState, type FormEvent, type ChangeEvent } from 'react';
import type { AdminUser, UserRole } from './types';

export interface UserFormValues {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  active: boolean;
  password: string;
  password_confirmation: string;
}

interface Props {
  mode: 'create' | 'edit';
  initialData?: Partial<AdminUser>;
  onSubmit: (values: UserFormValues) => Promise<void> | void;
  submitting?: boolean;
  error?: string | null;
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin',     label: 'Administrador' },
  { value: 'doctor',    label: 'Médico veterinario' },
  { value: 'asistente', label: 'Asistente / recepción' },
  { value: 'tutor',     label: 'Tutor (cliente)' },
];

export function UserForm({
  mode,
  initialData,
  onSubmit,
  submitting = false,
  error,
}: Props) {
  const [values, setValues] = useState<UserFormValues>(() => ({
    name: initialData?.name ?? '',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
    role: (initialData?.role as UserRole) ?? 'doctor',
    active: initialData?.active ?? true,
    password: '',
    password_confirmation: '',
  }));

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const target = e.target;
    const { name, value } = target;

    const isCheckbox =
      target instanceof HTMLInputElement && target.type === 'checkbox';

    setValues((prev) => ({
      ...prev,
      [name]: isCheckbox ? target.checked : value,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Validación básica en el front para modo create,
    // así evitamos varios 422 por cosas obvias.
    if (mode === 'create') {
      if (!values.password || values.password.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (values.password !== values.password_confirmation) {
        alert('La confirmación de contraseña no coincide.');
        return;
      }
    }

    await onSubmit(values);
  }

  const inputClasses =
    'w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400';

  const selectClasses =
    'w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400';

  const title =
    mode === 'create' ? 'Nuevo usuario interno' : 'Editar usuario';

  const isCreate = mode === 'create';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          {title}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Nombre completo *
            </label>
            <input
              name="name"
              className={inputClasses}
              value={values.name}
              onChange={handleChange}
              placeholder="Nombre y apellido"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Correo electrónico *
            </label>
            <input
              name="email"
              type="email"
              className={inputClasses}
              value={values.email}
              onChange={handleChange}
              placeholder="usuario@connyvet.cl"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Teléfono
            </label>
            <input
              name="phone"
              className={inputClasses}
              value={values.phone}
              onChange={handleChange}
              placeholder="+56 9 ..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Rol *
            </label>
            <select
              name="role"
              className={selectClasses}
              value={values.role}
              onChange={handleChange}
              required
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Seguridad y estado
          </h3>
          <p className="text-[11px] text-slate-500">
            Contraseña y activación del acceso.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3 md:col-span-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Contraseña {isCreate ? '*' : '(opcional)'}
              </label>
              <input
                name="password"
                type="password"
                className={inputClasses}
                value={values.password}
                onChange={handleChange}
                placeholder={
                  isCreate
                    ? 'Mínimo 8 caracteres'
                    : 'Deja en blanco para no cambiar'
                }
                minLength={isCreate ? 8 : undefined}
                required={isCreate}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Confirmar contraseña {isCreate ? '*' : ''}
              </label>
              <input
                name="password_confirmation"
                type="password"
                className={inputClasses}
                value={values.password_confirmation}
                onChange={handleChange}
                placeholder="Repite la contraseña"
                required={isCreate}
              />
            </div>
          </div>

          <div className="flex items-start md:items-center">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="active"
                checked={values.active}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Usuario activo</span>
            </label>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-medium text-white px-4 py-2.5 shadow-sm hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting
            ? isCreate
              ? 'Creando usuario…'
              : 'Guardando cambios…'
            : isCreate
            ? 'Crear usuario'
            : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
