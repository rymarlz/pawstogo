// src/router/AdminRoute.tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
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

  // Regla para admin:
  // 1) role === 'admin' (ideal)
  // 2) o correo del admin semilla
  const isAdmin =
    (user as any).role === 'admin' ||
    (user as any).email === 'admin@connyvet.test';

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
