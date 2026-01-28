// src/admin/pages/AdminUserListPage.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../../layouts/DashboardLayout';
import { fetchUsers, deleteUser } from '../api';
import type {
  AdminUser,
  AdminUserFilters,
  PaginatedMeta,
  UserRole,
} from '../types';
import { useAuth } from '../../../auth/AuthContext';

export function AdminUserListPage() {
  const { token } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [filters, setFilters] = useState<AdminUserFilters>({
    search: '',
    role: '',
    active: 'all',
    page: 1,
    per_page: 20,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) {
      setError('Sesión no válida. Vuelve a iniciar sesión.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // token PRIMERO, filtros después
      const res = await fetchUsers(token, filters);

      setUsers(res.data);
      setMeta(res.meta ?? null);
    } catch (e: any) {
      console.error('Error cargando usuarios RAW:', e);
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'No se pudieron cargar los usuarios.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.role, filters.active, filters.page, token]);

  function handleFilterChange<K extends keyof AdminUserFilters>(
    field: K,
    value: AdminUserFilters[K],
  ) {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      page: 1,
    }));
  }

  async function handleDelete(id: number) {
    if (!token) {
      alert('Sesión no válida. Vuelve a iniciar sesión.');
      return;
    }

    const ok = window.confirm(
      '¿Eliminar este usuario? Esta acción no se puede deshacer.',
    );
    if (!ok) return;

    try {
      await deleteUser(id, token);
      await load();
    } catch (e: any) {
      console.error('Error eliminando usuario:', e);
      alert(
        e?.response?.data?.message ||
          e?.message ||
          'No se pudo eliminar el usuario.',
      );
    }
  }

  const roleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'doctor':
        return 'Médico vet.';
      case 'asistente':
        return 'Asistente';
      case 'tutor':
        return 'Tutor';
      default:
        return role;
    }
  };

  function canPrev() {
    if (!meta) return false;
    return meta.current_page > 1;
  }

  function canNext() {
    if (!meta) return false;
    return meta.current_page < meta.last_page;
  }

  return (
    <DashboardLayout title="Usuarios y roles">
      {/* Encabezado */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            Usuarios internos del sistema
          </h2>
          <p className="text-sm text-slate-500">
            Administra cuentas, roles y acceso al panel clínico ConnyVet.
          </p>
        </div>
        <div>
          <Link
            to="/dashboard/usuarios/nuevo"
className="btn-accent"
          >
            + Nuevo usuario
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">
              Buscar
            </label>
            <input
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400"
              placeholder="Nombre, correo o teléfono"
              value={filters.search ?? ''}
              onChange={(e) =>
                handleFilterChange('search', e.target.value)
              }
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Rol
            </label>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400"
              value={filters.role ?? ''}
              onChange={(e) =>
                handleFilterChange(
                  'role',
                  (e.target.value || '') as AdminUserFilters['role'],
                )
              }
            >
              <option value="">Todos</option>
              <option value="admin">Administrador</option>
              <option value="doctor">Médico vet.</option>
              <option value="asistente">Asistente</option>
              <option value="tutor">Tutor</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Estado
            </label>
            <select
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400"
              value={filters.active ?? 'all'}
              onChange={(e) =>
                handleFilterChange(
                  'active',
                  e.target.value as AdminUserFilters['active'],
                )
              }
            >
              <option value="all">Todos</option>
              <option value="true">Solo activos</option>
              <option value="false">Solo inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            Cargando usuarios…
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-sm text-rose-600">
            {error}
          </div>
        ) : users.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">
            No se encontraron usuarios con los filtros actuales.
          </div>
        ) : (
          <>
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">
                    Nombre
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">
                    Correo
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">
                    Rol
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">
                    Estado
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="text-slate-800 font-medium">
                          {u.name}
                        </span>
                        {u.phone && (
                          <span className="text-xs text-slate-500">
                            {u.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {u.email}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-700">
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] ' +
                          (u.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500')
                        }
                      >
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-3">
                        <Link
                          to={`/dashboard/usuarios/${u.id}`}
                          className="text-xs text-sky-600 hover:text-sky-700"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id)}
                          className="text-xs text-rose-600 hover:text-rose-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginación simple */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs text-slate-600">
                <div>
                  Página {meta.current_page} de {meta.last_page}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canPrev()}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: (prev.page ?? 1) - 1,
                      }))
                    }
                    className="rounded-xl border border-slate-300 px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={!canNext()}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: (prev.page ?? 1) + 1,
                      }))
                    }
                    className="rounded-xl border border-slate-300 px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
