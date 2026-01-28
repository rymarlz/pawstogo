// src/clinic/pages/PatientEditPage.tsx
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { fetchPatient, updatePatient } from '../api';
import type { Patient, PatientPayload, Species, Sex } from '../types';
import { PatientVaccinesSection } from '../components/PatientVaccinesSection';
import { PatientConsultationsSection } from '../components/PatientConsultationsSection';
import { PatientClinicalSummary } from '../components/PatientClinicalSummary';

interface ApiValidationErrors {
  [key: string]: string[] | undefined;
}

const SPECIES_OPTIONS: { value: Species; label: string }[] = [
  { value: 'perro', label: 'Perro' },
  { value: 'gato', label: 'Gato' },
  { value: 'ave', label: 'Ave' },
  { value: 'roedor', label: 'Roedor' },
  { value: 'reptil', label: 'Reptil' },
  { value: 'otro', label: 'Otro' },
];

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
  { value: 'desconocido', label: 'Desconocido' },
];

function normalizeDate(value?: string | null): string {
  if (!value) return '';
  if (value.includes('T')) return value.split('T')[0];
  return value;
}

export function PatientEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState<{
    name: string;
    species: Species;
    breed: string;
    sex: Sex;
    birth_date: string;
    color: string;
    microchip: string;
    tutor_id: string;
    tutor_name: string;
    tutor_email: string;
    tutor_phone: string;
    active: boolean;
    weight_kg: string;
    sterilized: boolean;
    notes: string;
  }>({
    name: '',
    species: 'perro',
    breed: '',
    sex: 'desconocido',
    birth_date: '',
    color: '',
    microchip: '',
    tutor_id: '',
    tutor_name: '',
    tutor_email: '',
    tutor_phone: '',
    active: true,
    weight_kg: '',
    sterilized: false,
    notes: '',
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleChange<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm(prev => ({
      ...prev,
      [key]: value,
    }));
  }

  function handlePhotoChange(file: File | null) {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }

  useEffect(() => {
    async function load() {
      if (!token) {
        setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
        setLoading(false);
        return;
      }

      if (!id) {
        setErrorBanner('Paciente no encontrado.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorBanner(null);

        const p = (await fetchPatient(token, Number(id))) as Patient & {
          tutor?: {
            name?: string;
            email?: string;
            phone?: string;
          };
          photo_url?: string;
          tutor_id?: number;
          tutor_name?: string;
          tutor_email?: string;
          tutor_phone?: string;
          active?: boolean;
          weight_kg?: number | null;
          sterilized?: boolean;
          notes?: string | null;
        };

        setForm({
          name: p.name ?? '',
          species: (p.species as Species) ?? 'perro',
          breed: p.breed ?? '',
          sex: (p.sex as Sex) ?? 'desconocido',
          birth_date: normalizeDate((p as any).birth_date),
          color: p.color ?? '',
          microchip: p.microchip ?? '',
          tutor_id: p.tutor_id ? String(p.tutor_id) : '',
          tutor_name: p.tutor_name ?? p.tutor?.name ?? '',
          tutor_email: p.tutor_email ?? p.tutor?.email ?? '',
          tutor_phone: p.tutor_phone ?? p.tutor?.phone ?? '',
          active:
            typeof p.active === 'boolean'
              ? p.active
              : true,
          weight_kg:
            p.weight_kg !== null && p.weight_kg !== undefined
              ? String(p.weight_kg)
              : '',
          sterilized: !!p.sterilized,
          notes: p.notes ?? '',
        });

        setPhotoPreview(p.photo_url ?? null);
        setPhotoFile(null);
      } catch (err: any) {
        console.error('Error cargando paciente:', err);
        setErrorBanner(
          err?.message || 'No se pudo cargar la información del paciente.',
        );
      } finally {
        setLoading(false);
      }
    }

    void load();

    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    if (!id) {
      setErrorBanner('Paciente no encontrado.');
      return;
    }

    setSubmitting(true);
    setErrorBanner(null);
    setFieldErrors({});

    const payload: PatientPayload = {
      tutor_id: form.tutor_id ? Number(form.tutor_id) : null,
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim() || null,
      sex: form.sex,
      birth_date: form.birth_date || null,
      color: form.color.trim() || null,
      microchip: form.microchip.trim() || null,
      tutor_name: form.tutor_name.trim(),
      tutor_email: form.tutor_email.trim() || null,
      tutor_phone: form.tutor_phone.trim() || null,
      active: form.active,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      sterilized: form.sterilized,
      notes: form.notes.trim() || null,
    };

    try {
      await updatePatient(token, Number(id), payload, photoFile);
      navigate('/dashboard/pacientes');
    } catch (err: any) {
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
          err.messageApi || 'Revisa los campos marcados para continuar.',
        );
      } else {
        setErrorBanner(
          err?.message || 'Ocurrió un error al actualizar el paciente.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Editar paciente">
        <div className="max-w-4xl mx-auto card text-sm text-slate-600">
          Cargando datos del paciente…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Editar paciente">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Migas / header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
            <Link
              to="/dashboard/pacientes"
              className="hover:underline hover:text-slate-700"
            >
              Pacientes
            </Link>
            <span>/</span>
            <span className="font-medium text-slate-700">
              {form.name || 'Editar paciente'}
            </span>
          </div>

          {/* Acciones rápidas: vacunas + volver */}
          <div className="flex flex-wrap items-center gap-2">
            {id && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/dashboard/vacunas?patient_id=${id}`)
                  }
                  className="rounded-xl border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
                >
                  Ver vacunas
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/dashboard/vacunas/nueva?patient_id=${id}`,
                    )
                  }
                  className="rounded-xl border border-emerald-300 px-3 py-1.5 text-[11px] text-emerald-700 hover:bg-emerald-50 text-[11px]"
                >
                  Agendar vacuna
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
            >
              Volver
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)]">
          {/* Form principal */}
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="flex items-start justify-between gap-3 space-y-1">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Datos de la mascota
                </h2>
                <p className="text-xs text-slate-500">
                  Actualiza la información del paciente y su tutor. Estos datos
                  se usarán en fichas, vacunas y hospitalización.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={
                    form.active
                      ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700'
                      : 'inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600'
                  }
                >
                  {form.active ? 'Activo' : 'Inactivo'}
                </span>
                <span className="text-[11px] text-slate-400">
                  ID: {id ?? '—'}
                </span>
              </div>
            </header>

            {errorBanner && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {errorBanner}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre / especie / raza */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5 md:col-span-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Nombre del paciente
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => handleChange('name', e.target.value)}
                    placeholder="Firulais, Luna, etc."
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
                    Especie
                  </label>
                  <select
                    value={form.species}
                    onChange={e =>
                      handleChange('species', e.target.value as Species)
                    }
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.species
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {SPECIES_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.species && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.species}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Raza
                  </label>
                  <input
                    type="text"
                    value={form.breed}
                    onChange={e => handleChange('breed', e.target.value)}
                    placeholder="Ej: Mestizo, Poodle, Siamés, etc."
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.breed
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.breed && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.breed}
                    </p>
                  )}
                </div>
              </div>

              {/* sexo / nacimiento / color */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Sexo
                  </label>
                  <select
                    value={form.sex}
                    onChange={e => handleChange('sex', e.target.value as Sex)}
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.sex
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {SEX_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.sex && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.sex}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Fecha de nacimiento (aprox.)
                  </label>
                  <input
                    type="date"
                    value={form.birth_date}
                    onChange={e =>
                      handleChange('birth_date', e.target.value)
                    }
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.birth_date
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.birth_date && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.birth_date}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Color / señas
                  </label>
                  <input
                    type="text"
                    value={form.color}
                    onChange={e => handleChange('color', e.target.value)}
                    placeholder="Ej: negro con manchas blancas"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.color
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.color && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.color}
                    </p>
                  )}
                </div>
              </div>

              {/* Foto */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Foto del paciente
                </label>

                {photoPreview && (
                  <div className="mb-2 flex items-center gap-3">
                    <img
                      src={photoPreview}
                      alt={form.name || 'Paciente'}
                      className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                    />
                    <span className="text-[11px] text-slate-500">
                      {photoFile
                        ? 'Vista previa de la nueva foto'
                        : 'Foto actual del paciente'}
                    </span>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={e =>
                    handlePhotoChange(
                      e.target.files && e.target.files[0]
                        ? e.target.files[0]
                        : null,
                    )
                  }
                  className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
                />
                <p className="text-[11px] text-slate-400">
                  Si seleccionas una nueva imagen, se guardará en el sistema y
                  reemplazará la foto anterior al guardar los cambios.
                </p>
              </div>

              {/* peso / esterilizado */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.weight_kg}
                    onChange={e =>
                      handleChange('weight_kg', e.target.value)
                    }
                    placeholder="Ej: 4.50"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.weight_kg
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.weight_kg && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.weight_kg}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2 flex items-center gap-3 space-y-0">
                  <button
                    type="button"
                    onClick={() =>
                      handleChange('sterilized', !form.sterilized)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                      form.sterilized
                        ? 'border-emerald-400 bg-emerald-500'
                        : 'border-slate-300 bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.sterilized ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-slate-700">
                    {form.sterilized
                      ? 'Paciente esterilizado / castrado'
                      : 'Paciente no esterilizado (o desconocido)'}
                  </span>
                </div>
              </div>

              {/* microchip */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Microchip (opcional)
                </label>
                <input
                  type="text"
                  value={form.microchip}
                  onChange={e => handleChange('microchip', e.target.value)}
                  placeholder="Número de microchip"
                  className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    fieldErrors.microchip
                      ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                      : 'border-slate-300 bg-white'
                  }`}
                />
                {fieldErrors.microchip && (
                  <p className="text-[11px] text-rose-500">
                    {fieldErrors.microchip}
                  </p>
                )}
              </div>

              {/* notas */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Notas / antecedentes generales (opcional)
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  placeholder="Alergias, antecedentes clínicos relevantes, comportamiento, etc."
                  className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                    fieldErrors.notes
                      ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                      : 'border-slate-300 bg-white'
                  }`}
                />
                {fieldErrors.notes && (
                  <p className="text-[11px] text-rose-500">
                    {fieldErrors.notes}
                  </p>
                )}
              </div>

              {/* datos tutor */}
              <div className="space-y-3 border-t border-slate-100 pt-2">
                <h3 className="text-xs font-semibold text-slate-800">
                  Datos del tutor
                </h3>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    ID del tutor (si ya existe en el sistema)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.tutor_id}
                    onChange={e =>
                      handleChange('tutor_id', e.target.value)
                    }
                    placeholder="Ej: 12"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.tutor_id
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.tutor_id && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.tutor_id}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Si indicas un ID de tutor válido, el paciente quedará
                    vinculado a ese tutor. También puedes mantener sólo los
                    datos de referencia.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Nombre del tutor
                    </label>
                    <input
                      type="text"
                      value={form.tutor_name}
                      onChange={e =>
                        handleChange('tutor_name', e.target.value)
                      }
                      placeholder="Nombre y apellido del responsable"
                      className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        fieldErrors.tutor_name
                          ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                    {fieldErrors.tutor_name && (
                      <p className="text-[11px] text-rose-500">
                        {fieldErrors.tutor_name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Correo del tutor (opcional)
                    </label>
                    <input
                      type="email"
                      value={form.tutor_email}
                      onChange={e =>
                        handleChange('tutor_email', e.target.value)
                      }
                      placeholder="tutor@ejemplo.com"
                      className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                        fieldErrors.tutor_email
                          ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                    {fieldErrors.tutor_email && (
                      <p className="text-[11px] text-rose-500">
                        {fieldErrors.tutor_email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Teléfono del tutor (opcional)
                  </label>
                  <input
                    type="tel"
                    value={form.tutor_phone}
                    onChange={e =>
                      handleChange('tutor_phone', e.target.value)
                    }
                    placeholder="+56 9 1234 5678"
                    className={`w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                      fieldErrors.tutor_phone
                        ? 'border-rose-400 focus:ring-rose-400 focus:border-rose-400'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                  {fieldErrors.tutor_phone && (
                    <p className="text-[11px] text-rose-500">
                      {fieldErrors.tutor_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* estado */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
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
                      ? 'Paciente activo en la clínica'
                      : 'Paciente inactivo (solo histórico)'}
                  </span>
                </div>
              </div>

              {/* acciones */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Guardando…' : 'Guardar cambios'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard/pacientes')}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>

          {/* Panel lateral */}
          <aside className="space-y-4">
            {/* Resumen clínico */}
            {id && (
              <PatientClinicalSummary patientId={Number(id)} />
            )}

            {/* Tips clínicos */}
            <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 text-xs shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Buen seguimiento clínico
              </h3>
              <ul className="ml-4 list-disc space-y-1 text-slate-600">
                <li>
                  Mantener actualizada la edad, peso y esterilización mejora la
                  calidad de las indicaciones médicas.
                </li>
                <li>
                  Revisa que los datos de contacto del tutor estén al día para
                  recordatorios y urgencias.
                </li>
                <li>
                  Puedes inactivar pacientes que ya no se atienden,
                  manteniendo su historial clínico.
                </li>
              </ul>
            </section>
          </aside>
        </div>

        {/* Vacunas del paciente */}
        {id && (
          <PatientVaccinesSection patientId={Number(id)} />
        )}

        {/* Historial de consultas del paciente */}
        {id && (
          <PatientConsultationsSection patientId={Number(id)} />
        )}
      </div>
    </DashboardLayout>
  );
}
