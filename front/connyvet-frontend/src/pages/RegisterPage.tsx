// src/pages/RegisterPage.tsx
import { type FormEvent, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../auth/AuthLayout';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] =
    useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !passwordConfirmation) {
      setError('Completa todos los campos.');
      return;
    }

    if (password !== passwordConfirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setSubmitting(true);
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      if (err?.errors) {
        const msgs = Object.values(err.errors)
          .flat()
          .join(' ');
        setError(msgs);
      } else {
        setError(err?.message || 'No se pudo registrar.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Registro de usuario"
      subtitle="Crea un usuario para acceder al sistema clínico ConnyVet."
      bottomText={
        <span>
          ¿Ya tienes acceso?{' '}
          <Link to="/login" className="underline">
            Iniciar sesión
          </Link>
        </span>
      }
    >
      {error && (
        <div className="mb-4 rounded-2xl bg-rose-950/60 border border-rose-700/70 px-3 py-2 text-xs text-rose-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300">
            Nombre completo
          </label>
          <input
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre y apellido"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300">
            Correo electrónico
          </label>
          <input
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.cl"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Contraseña
            </label>
            <input
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300">
              Confirmar contraseña
            </label>
            <input
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              type="password"
              autoComplete="new-password"
              value={passwordConfirmation}
              onChange={(e) =>
                setPasswordConfirmation(e.target.value)
              }
              placeholder="Repite la contraseña"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-sm font-medium text-white py-2.5 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    </AuthLayout>
  );
}
