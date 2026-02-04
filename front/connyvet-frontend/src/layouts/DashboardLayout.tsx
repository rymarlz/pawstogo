// src/layouts/DashboardLayout.tsx
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface DashboardLayoutProps {
  title: string;
  children: ReactNode;
}

type Role = 'admin' | 'doctor' | 'asistente' | 'tutor';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles?: Role[];
}

interface NavSection {
  label: string;
  color: 'emerald' | 'sky' | 'amber' | 'violet';
  items: NavItem[];
}

/* ============================================================
   MENÚ REAL BASADO EN LOS MÓDULOS QUE SÍ EXISTEN EN EL SISTEMA
   ============================================================ */

const navSections: NavSection[] = [
  {
    label: 'Clínica',
    color: 'emerald',
    items: [
      { to: '/dashboard', label: 'Resumen general', icon: '🏥' },

      // ✅ Unificar: aquí va la agenda real de consultas
      { to: '/dashboard/consultas', label: 'Agenda y consultas', icon: '🗓️' },

      { to: '/dashboard/vacunas', label: 'Vacunas pendientes', icon: '💉' },

      // ⚠️ Solo si este módulo existe realmente:
      // { to: '/dashboard/internaciones', label: 'Hospitalización', icon: '🏨' },
    ],
  },

  {
    label: 'Pacientes y tutores',
    color: 'sky',
    items: [
      { to: '/dashboard/pacientes', label: 'Pacientes', icon: '🐾' },
      { to: '/dashboard/tutores', label: 'Tutores', icon: '👤' },
    ],
  },

  {
    label: 'Administración',
    color: 'violet',
    items: [
      { to: '/dashboard/pagos', label: 'Pagos', icon: '💵', roles: ['admin', 'doctor'] },

      { to: '/dashboard/presupuestos', label: 'Presupuestos', icon: '🧾', roles: ['admin', 'doctor'] },

      { to: '/dashboard/catalogo-vacunas', label: 'Catálogo de vacunas', icon: '💊', roles: ['admin'] },

      { to: '/dashboard/usuarios', label: 'Usuarios y roles', icon: '👥', roles: ['admin'] },
    ],
  },
];


const roleLabels: Record<Role, string> = {
  admin: 'Administrador',
  doctor: 'Médico veterinario',
  asistente: 'Asistente',
  tutor: 'Tutor',
};

/* ============================================================
   LAYOUT
   ============================================================ */

export function DashboardLayout({ title, children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const role: Role = (user?.role as Role) ?? 'tutor';

  const visibleSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.roles || item.roles.includes(role)),
    }))
    .filter(section => section.items.length > 0);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // ignorar errores de logout en UI
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-800">
      {/* ====================================== */}
      {/* SIDEBAR */}
      {/* ====================================== */}
      <aside className="hidden md:flex md:w-64 lg:w-72 bg-slate-50/90 border-r border-slate-200 flex-col backdrop-blur-sm">
        {/* BRAND */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200 bg-emerald-50/70">
          <div className="h-9 w-9 rounded-2xl bg-emerald-100 flex items-center justify-center text-lg font-semibold text-emerald-700">
            CV
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">ConnyVet</p>
            <p className="text-xs text-slate-500">Gestión veterinaria</p>
          </div>
        </div>

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 text-sm">
          {visibleSections.map(section => (
            <div key={section.label}>
              <p className="px-3 mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
                <span
                  className={
                    section.color === 'emerald'
                      ? 'h-1.5 w-1.5 rounded-full bg-emerald-300'
                      : section.color === 'sky'
                      ? 'h-1.5 w-1.5 rounded-full bg-sky-300'
                      : section.color === 'amber'
                      ? 'h-1.5 w-1.5 rounded-full bg-amber-300'
                      : 'h-1.5 w-1.5 rounded-full bg-violet-300'
                  }
                />
                {section.label}
              </p>

              <div className="space-y-1">
                {section.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => {
                      const base =
                        'flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors text-sm';
                      const inactive =
                        'bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900';
                      let activeColors =
                        'bg-emerald-50 text-emerald-800 border-emerald-200';

                      if (section.color === 'sky')
                        activeColors = 'bg-sky-50 text-sky-800 border-sky-200';
                      if (section.color === 'amber')
                        activeColors = 'bg-amber-50 text-amber-800 border-amber-200';
                      if (section.color === 'violet')
                        activeColors = 'bg-violet-50 text-violet-800 border-violet-200';

                      return [base, isActive ? activeColors : inactive].join(' ');
                    }}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* USER PANEL */}
        <div className="border-t border-slate-200 px-4 py-3 text-xs bg-slate-50/90">
          <p className="font-medium text-slate-800">{user?.name ?? 'Usuario'}</p>
          <p className="truncate text-slate-500">{user?.email}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Rol: {roleLabels[role]}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 inline-flex items-center rounded-xl border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
            aria-label="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ====================================== */}
      {/* MAIN CONTENT */}
      {/* ====================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="h-16 px-4 md:px-6 border-b border-slate-200 bg-slate-50/95 backdrop-blur flex items-center justify-between shadow-sm">
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Panel clínico</p>
            <h1 className="text-lg font-semibold truncate text-slate-800">
              {title}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100"
            aria-label="Cerrar sesión"
          >
            Salir
          </button>
        </header>

        {/* CONTENT */}
        <main className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-y-auto bg-slate-100">
          <div className="max-w-6xl mx-auto space-y-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
