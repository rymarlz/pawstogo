// src/tutores/TutorForm.tsx
import {
  useState,
  type FormEvent,
  type ChangeEvent,
} from 'react';
import type { Tutor } from './types';

export type TutorFormValues = {
  nombres: string;
  apellidos: string;
  rut: string;
  email: string;
  telefono_movil: string;
  telefono_fijo: string;
  direccion: string;
  comuna: string;
  region: string;
  estado_civil: string;
  ocupacion: string;
  nacionalidad: string;
  fecha_nacimiento: string;
  banco: string;
  ejecutivo: string;
  sucursal: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  titular_cuenta: string;
  rut_titular: string;
  alias_transferencia: string;
  email_para_pagos: string;
  telefono_banco: string;
  comentarios: string;
  comentarios_generales: string;
};

type Props = {
  mode: 'create' | 'edit';
  initialData?: Partial<Tutor>;
  onSubmit: (values: TutorFormValues) => Promise<void> | void;
  submitting?: boolean;
  error?: string | null;
};

export function TutorForm({
  mode,
  initialData,
  onSubmit,
  submitting = false,
  error,
}: Props) {
  const [values, setValues] = useState<TutorFormValues>(() => ({
    nombres: initialData?.nombres ?? '',
    apellidos: initialData?.apellidos ?? '',
    rut: initialData?.rut ?? '',
    email: initialData?.email ?? '',
    telefono_movil: initialData?.telefono_movil ?? '',
    telefono_fijo: initialData?.telefono_fijo ?? '',
    direccion: initialData?.direccion ?? '',
    comuna: initialData?.comuna ?? '',
    region: initialData?.region ?? '',
    estado_civil: initialData?.estado_civil ?? '',
    ocupacion: initialData?.ocupacion ?? '',
    nacionalidad: initialData?.nacionalidad ?? '',
    fecha_nacimiento: initialData?.fecha_nacimiento ?? '',
    banco: initialData?.banco ?? '',
    ejecutivo: initialData?.ejecutivo ?? '',
    sucursal: initialData?.sucursal ?? '',
    tipo_cuenta: initialData?.tipo_cuenta ?? '',
    numero_cuenta: initialData?.numero_cuenta ?? '',
    titular_cuenta: initialData?.titular_cuenta ?? '',
    rut_titular: initialData?.rut_titular ?? '',
    alias_transferencia: initialData?.alias_transferencia ?? '',
    email_para_pagos: initialData?.email_para_pagos ?? '',
    telefono_banco: initialData?.telefono_banco ?? '',
    comentarios: initialData?.comentarios ?? '',
    comentarios_generales: initialData?.comentarios_generales ?? '',
  }));

  function handleChange(
    e: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit(values);
  }

  const title =
    mode === 'create'
      ? 'Datos del tutor'
      : 'Editar datos del tutor';

  const inputClasses =
    'w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400';

  const textareaClasses =
    'w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 min-h-[120px] resize-y';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Datos principales */}
      <section className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          {title}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Nombres *
            </label>
            <input
              name="nombres"
              className={inputClasses}
              value={values.nombres}
              onChange={handleChange}
              placeholder="Nombres del tutor"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Apellidos
            </label>
            <input
              name="apellidos"
              className={inputClasses}
              value={values.apellidos}
              onChange={handleChange}
              placeholder="Apellidos del tutor"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              RUT
            </label>
            <input
              name="rut"
              className={inputClasses}
              value={values.rut}
              onChange={handleChange}
              placeholder="11.111.111-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Fecha de nacimiento
            </label>
            <input
              name="fecha_nacimiento"
              type="date"
              className={inputClasses}
              value={values.fecha_nacimiento}
              onChange={handleChange}
            />
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          Contacto
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">
              Correo
            </label>
            <input
              name="email"
              type="email"
              className={inputClasses}
              value={values.email}
              onChange={handleChange}
              placeholder="tutor@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Teléfono móvil
            </label>
            <input
              name="telefono_movil"
              className={inputClasses}
              value={values.telefono_movil}
              onChange={handleChange}
              placeholder="+56 9 ..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Teléfono fijo
            </label>
            <input
              name="telefono_fijo"
              className={inputClasses}
              value={values.telefono_fijo}
              onChange={handleChange}
              placeholder="(2) ..."
            />
          </div>
        </div>
      </section>

      {/* Dirección y perfil */}
      <section className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          Dirección y perfil
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Dirección
              </label>
              <input
                name="direccion"
                className={inputClasses}
                value={values.direccion}
                onChange={handleChange}
                placeholder="Calle, número, depto."
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Comuna
                </label>
                <input
                  name="comuna"
                  className={inputClasses}
                  value={values.comuna}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Región
                </label>
                <input
                  name="region"
                  className={inputClasses}
                  value={values.region}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Estado civil
                </label>
                <input
                  name="estado_civil"
                  className={inputClasses}
                  value={values.estado_civil}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Ocupación
                </label>
                <input
                  name="ocupacion"
                  className={inputClasses}
                  value={values.ocupacion}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Nacionalidad
              </label>
              <input
                name="nacionalidad"
                className={inputClasses}
                value={values.nacionalidad}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Información bancaria */}
      <section className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Información bancaria
          </h3>
          <p className="text-[11px] text-slate-500">
            Datos usados para pagos y reembolsos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Banco
              </label>
              <input
                name="banco"
                className={inputClasses}
                value={values.banco}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Tipo de cuenta
              </label>
              <input
                name="tipo_cuenta"
                className={inputClasses}
                value={values.tipo_cuenta}
                onChange={handleChange}
                placeholder="Vista, Cta Cte, Ahorro..."
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Número de cuenta
              </label>
              <input
                name="numero_cuenta"
                className={inputClasses}
                value={values.numero_cuenta}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Titular de la cuenta
              </label>
              <input
                name="titular_cuenta"
                className={inputClasses}
                value={values.titular_cuenta}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                RUT titular
              </label>
              <input
                name="rut_titular"
                className={inputClasses}
                value={values.rut_titular}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Alias transferencia
              </label>
              <input
                name="alias_transferencia"
                className={inputClasses}
                value={values.alias_transferencia}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Correo para pagos
              </label>
              <input
                name="email_para_pagos"
                type="email"
                className={inputClasses}
                value={values.email_para_pagos}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Teléfono banco
              </label>
              <input
                name="telefono_banco"
                className={inputClasses}
                value={values.telefono_banco}
                onChange={handleChange}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Ejecutivo
                </label>
                <input
                  name="ejecutivo"
                  className={inputClasses}
                  value={values.ejecutivo}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Sucursal
                </label>
                <input
                  name="sucursal"
                  className={inputClasses}
                  value={values.sucursal}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comentarios */}
      <section className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          Comentarios
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Comentarios
            </label>
            <textarea
              name="comentarios"
              className={textareaClasses}
              rows={4}
              value={values.comentarios}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Comentarios generales
            </label>
            <textarea
              name="comentarios_generales"
              className={textareaClasses}
              rows={4}
              value={values.comentarios_generales}
              onChange={handleChange}
            />
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
            ? mode === 'create'
              ? 'Creando tutor…'
              : 'Guardando cambios…'
            : mode === 'create'
            ? 'Crear tutor'
            : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
