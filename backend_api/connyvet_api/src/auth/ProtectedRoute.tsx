// src/auth/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function ProtectedRoute({ children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-sm text-slate-300">Cargando sesión…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
