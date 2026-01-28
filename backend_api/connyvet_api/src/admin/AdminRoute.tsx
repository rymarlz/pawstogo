// src/router/AdminRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">
        Cargando…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 🔓 POR AHORA: no filtramos por rol, solo que esté autenticado
  // Luego, cuando veamos exactamente qué viene en user (role, email),
  // volvemos a activar la validación de admin.
  return <Outlet />;
}
