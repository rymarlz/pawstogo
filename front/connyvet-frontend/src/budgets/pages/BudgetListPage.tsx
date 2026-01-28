import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { fetchBudgets } from '../api';
import { DashboardLayout } from '../../layouts/DashboardLayout';

export function BudgetListPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const res = await fetchBudgets(token, { per_page: 50 });
      setItems(res.data ?? []);
    })();
  }, [token]);

  return (
    <DashboardLayout title="Presupuestos">
      <div className="app-main space-y-4">
        <div className="card flex items-center justify-between">
          <div>
            <h1>Presupuestos</h1>
            <div className="muted">Listado de presupuestos</div>
          </div>
<Link className="btn-accent"to="/dashboard/presupuestos/nuevo">+ Crear</Link>        </div>

        <div className="card">
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Paciente</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id}>
                  <td>{b.code}</td>
                  <td>{b.patient?.name ?? '-'}</td>
                  <td>{b.status}</td>
                  <td style={{ textAlign: 'right' }}>${Number(b.total ?? 0).toFixed(0)}</td>
                  <td style={{ textAlign: 'right' }}>
                  <Link className="btn-secondary" to={`/dashboard/presupuestos/${b.id}`}>Ver</Link>                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={5} className="muted">Sin registros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
