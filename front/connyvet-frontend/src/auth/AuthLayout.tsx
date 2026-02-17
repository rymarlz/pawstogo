import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  bottomText?: ReactNode;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, bottomText, children }: AuthLayoutProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-6"
      style={{
        background: 'linear-gradient(160deg, #f0fdfa 0%, #f8fafc 40%, #f1f5f9 100%)',
      }}
    >
      <div className="w-full max-w-5xl grid gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-stretch">
        {/* Panel de marca / información */}
        <section className="hidden md:flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm p-6">
          {/* Logo */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-teal-100 flex items-center justify-center text-lg font-semibold text-teal-700">
                CV
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  ConnyVet
                </p>
                <p className="text-xs text-slate-500">
                  Gestión clínica veterinaria
                </p>
              </div>
            </div>

            <Link
              to="/"
              className="text-[11px] text-emerald-700 hover:text-emerald-600 font-medium"
            >
              Ir al inicio
            </Link>
          </div>

          {/* Mensaje central */}
          <div className="mt-6 space-y-3">
            <h2 className="text-xl font-semibold text-slate-900 leading-snug">
              Ordena tu clínica, protege a tus pacientes.
            </h2>
            <p className="text-sm text-slate-600">
              ConnyVet centraliza fichas clínicas, agenda, vacunas y hospitalizaciones
              en un panel único para tu equipo. Pensado para médicos, asistentes y
              administración.
            </p>
            <div className="mt-4 grid gap-3 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <span className="mt-[2px] h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-700 font-semibold">
                  ✓
                </span>
                <p>
                  Historias clínicas completas y organizadas por paciente y tutor.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-[2px] h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-700 font-semibold">
                  ✓
                </span>
                <p>Alertas de vacunas y hospitalización en tiempo real.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-[2px] h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] text-emerald-700 font-semibold">
                  ✓
                </span>
                <p>Control de accesos por rol y trazabilidad interna.</p>
              </div>
            </div>
          </div>

          {/* Footer pequeño */}
          <div className="mt-6 pt-4 border-t border-emerald-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>© {new Date().getFullYear()} ConnyVet</span>
            <span className="italic">Entorno para uso clínico interno</span>
          </div>
        </section>

        {/* Panel de formulario */}
        <section className="flex flex-col justify-center">
          <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-sm px-5 py-6 md:px-6 md:py-7">
            {/* Cabecera en mobile con logo */}
            <div className="mb-5 flex items-center justify-between gap-3 md:hidden">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-2xl bg-emerald-100 flex items-center justify-center text-sm font-semibold text-emerald-700">
                  CV
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">ConnyVet</p>
                  <p className="text-[11px] text-slate-500">
                    Gestión clínica veterinaria
                  </p>
                </div>
              </div>
              <Link
                to="/"
                className="text-[11px] text-emerald-700 hover:text-emerald-600 font-medium"
              >
                Ir al inicio
              </Link>
            </div>

            {/* Título / subtítulo */}
            <header className="mb-5 space-y-1">
              <h1 className="text-lg font-semibold text-slate-900">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-500 leading-snug">
                  {subtitle}
                </p>
              )}
            </header>

            {/* Contenido del formulario */}
            {children}

            {/* Texto inferior */}
            {bottomText && (
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                {bottomText}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
