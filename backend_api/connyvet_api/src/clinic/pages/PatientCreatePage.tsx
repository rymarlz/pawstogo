// src/clinic/pages/PatientCreatePage.tsx
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../auth/AuthContext';
import { createPatient } from '../api';
import type { PatientPayload, Species, Sex } from '../types';

// 👉 API y tipos de TUTORES
import { tutoresApi } from '../../tutores/api';
import type { Tutor, TutorListResponse } from '../../tutores/types';

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

export function PatientCreatePage() {
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

  // Preview sólo front
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  // 👇 File real que se envía al backend
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // búsqueda de tutor
  const [tutorSearch, setTutorSearch] = useState('');
  const [tutorResults, setTutorResults] = useState<Tutor[]>([]);
  const [tutorSearching, setTutorSearching] = useState(false);
  const [tutorSearchError, setTutorSearchError] = useState<string | null>(null);
  const [showTutorResults, setShowTutorResults] = useState(false);

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
    setPhotoFile(file); // 👈 guardamos el File

    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  }

  // ======================
  // Buscar tutores
  // ======================
  async function handleTutorSearch() {
    if (!token) {
      setTutorSearchError('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    setTutorSearching(true);
    setTutorSearchError(null);
    setShowTutorResults(false);

    try {
      const res: TutorListResponse = await tutoresApi.list(
        {
          search: tutorSearch || undefined,
          page: 1,
          per_page: 200,
        },
        token,
      );

      const list = Array.isArray(res.data) ? res.data : [];
      setTutorResults(list);

      if (list.length === 0) {
        setTutorSearchError('No se encontraron tutores con ese criterio.');
      } else {
        setShowTutorResults(true);
      }
    } catch (err: any) {
      console.error('Error buscando tutores:', err);
      setTutorSearchError(
        err?.message || 'No se pudieron buscar los tutores.',
      );
    } finally {
      setTutorSearching(false);
    }
  }

  function handleTutorSelect(tutor: Tutor) {
    const nombreCompleto = [tutor.nombres, tutor.apellidos]
      .filter(Boolean)
      .join(' ');

    handleChange('tutor_id', String(tutor.id));
    handleChange('tutor_name', nombreCompleto || '');
    handleChange('tutor_email', tutor.email || '');
    handleChange(
      'tutor_phone',
      tutor.telefono_movil || tutor.telefono_fijo || '',
    );

    setShowTutorResults(false);
  }

  // ======================
  // Submit paciente
  // ======================
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!token) {
      setErrorBanner('Sesión no válida. Vuelve a iniciar sesión.');
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
      // 👇 ahora sí se envía la foto
      await createPatient(token, payload, photoFile);
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
          err?.message || 'Ocurrió un error al crear el paciente.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="Nuevo paciente">
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Migas / header */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
            <Link
              to="/dashboard/pacientes"
              className="hover:underline hover:text-slate-700"
            >
              Pacientes
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">
              Nuevo paciente
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
            <header className="space-y-1 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Datos de la mascota
                </h2>
                <p className="text-xs text-slate-500">
                  Registra un nuevo paciente y vincúlalo a su tutor. Luego
                  podrás crear fichas clínicas, vacunas y hospitalizaciones.
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

              {/* Foto del paciente (preview + upload) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Foto del paciente (vista previa)
                </label>

                {photoPreview && (
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={photoPreview}
                      alt={form.name || 'Paciente'}
                      className="h-16 w-16 rounded-full object-cover border border-slate-200"
                    />
                    <span className="text-[11px] text-slate-500">
                      Vista previa de la foto
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
                  className="block w-full text-xs text-slate-700
                             file:mr-3 file:rounded-xl file:border-0
                             file:bg-emerald-50 file:px-3 file:py-1.5
                             file:text-xs file:font-medium file:text-emerald-700
                             hover:file:bg-emerald-100"
                />
                <p className="text-[11px] text-slate-400">
                  La imagen se guardará en el servidor y se mostrará en la ficha del paciente.
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

                <div className="space-y-1.5 md:col-span-2 flex items-center gap-3">
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

              {/* chip */}
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
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-semibold text-slate-800">
                  Datos del tutor
                </h3>

                {/* Buscar tutor existente */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    Buscar tutor existente
                  </label>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <input
                      type="search"
                      value={tutorSearch}
                      onChange={e => setTutorSearch(e.target.value)}
                      placeholder="Nombre, correo, RUT o teléfono…"
                      className="w-full rounded-2xl border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 border-slate-300 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleTutorSearch}
                      disabled={tutorSearching}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {tutorSearching ? 'Buscando…' : 'Buscar tutor'}
                    </button>
                  </div>
                  {tutorSearchError && (
                    <p className="text-[11px] text-rose-500">
                      {tutorSearchError}
                    </p>
                  )}

                  {showTutorResults && tutorResults.length > 0 && (
                    <div className="mt-2 max-h-60 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 text-[11px] space-y-1">
                      {tutorResults.map(tutor => {
                        const nombreCompleto = [
                          tutor.nombres,
                          tutor.apellidos,
                        ]
                          .filter(Boolean)
                          .join(' ');
                        return (
                          <button
                            key={tutor.id}
                            type="button"
                            onClick={() => handleTutorSelect(tutor)}
                            className="w-full text-left rounded-xl px-2 py-1 hover:bg-white hover:shadow-sm"
                          >
                            <div className="font-medium text-slate-800">
                              {nombreCompleto || 'Sin nombre'}
                            </div>
                            <div className="text-slate-600">
                              {tutor.email || 'Sin correo'}
                            </div>
                            <div className="text-slate-500">
                              {tutor.telefono_movil ||
                                tutor.telefono_fijo ||
                                'Sin teléfono'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ID + datos del tutor */}
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
              <div className="pt-3 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Guardando…' : 'Crear paciente'}
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
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Buen registro inicial
              </h3>
              <ul className="list-disc pl-4 text-slate-600 space-y-1">
                <li>
                  Registrar la fecha de nacimiento ayuda a programar vacunas y
                  controles según la etapa de vida.
                </li>
                <li>
                  Los datos del tutor son clave para recordatorios de vacunas,
                  desparasitaciones y controles.
                </li>
                <li>
                  Puedes actualizar estos datos luego desde la ficha del
                  paciente.
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
