// src/budgets/pages/BudgetCreatePage.tsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { createBudget } from '../api';
import { BudgetForm } from '../components/BudgetForm';
import { DashboardLayout } from '../../layouts/DashboardLayout';

export function BudgetCreatePage() {
  const nav = useNavigate();
  const { token } = useAuth();

  return (
    <DashboardLayout title="Presupuestos">
      <div className="app-main space-y-4">
        <div className="card">
          <h1>Nuevo presupuesto</h1>
          <div className="muted">
            Crea un presupuesto y luego descárgalo (PDF) o envíalo por correo
          </div>
        </div>

        <BudgetForm
          initial={{
            title: '',
            status: 'draft',
            currency: 'CLP',
            valid_until: null,
            notes: '',
            terms: '',
            items: [
              {
                name: '',
                description: '',
                qty: 1,
                unit_price: 0,
                discount: 0,
                tax_rate: 19,
                sort_order: 0,
              },
            ],
          }}
          submitLabel="Crear"
          onSubmit={async (payload) => {
            if (!token) return;

            const res = await createBudget(token, payload);

            // ✅ ruta correcta según tu App.tsx:
            nav(`/dashboard/presupuestos/${res.data.id}`);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
