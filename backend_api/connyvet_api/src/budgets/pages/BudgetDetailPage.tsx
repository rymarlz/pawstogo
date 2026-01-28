import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { budgetPdfUrl, getBudget, sendBudgetEmail, updateBudget } from '../api';
import { BudgetForm } from '../components/BudgetForm';
import { DashboardLayout } from '../../layouts/DashboardLayout';

export function BudgetDetailPage() {
  const { id } = useParams();
  const budgetId = Number(id);
  const { token } = useAuth();

  const [data, setData] = useState<any | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token || !budgetId) return;
      const res = await getBudget(token, budgetId);
      setData(res.data);
    })();
  }, [token, budgetId]);

  if (!data) return <div className="app-main">Cargando…</div>;

  return (
     <DashboardLayout title="Presupuestos">
      <div className="app-main space-y-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h1>{data.code}</h1>
              <div className="muted">Estado: {data.status}</div>
            </div>

            <div className="flex items-center gap-2">
  <a
  className="btn-secondary"
  href={budgetPdfUrl(data.id, token!)}
  target="_blank"
  rel="noreferrer"
>
  Descargar PDF
</a>


              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="correo@cliente.cl"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  style={{ width: 260 }}
                />
                <button
                  type="button"
                  disabled={sending}
                  onClick={async () => {
                    if (!token) return;
                    setSending(true);
                    try {
                      await sendBudgetEmail(token, data.id, emailTo);
                      alert('Enviado');
                    } finally {
                      setSending(false);
                    }
                  }}
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>

        <BudgetForm
          initial={{
            patient_id: data.patient_id,
            tutor_id: data.tutor_id,
            consultation_id: data.consultation_id,
            title: data.title,
            status: data.status,
            currency: data.currency,
            valid_until: data.valid_until,
            notes: data.notes,
            terms: data.terms,
            items: (data.items ?? []).map((it: any) => ({
              sort_order: it.sort_order,
              name: it.name,
              description: it.description,
              qty: Number(it.qty),
              unit_price: Number(it.unit_price),
              discount: Number(it.discount),
              tax_rate: Number(it.tax_rate),
            })),
          }}
          onSubmit={async (payload) => {
            if (!token) return;
            const res = await updateBudget(token, data.id, payload);
            setData(res.data);
            alert('Guardado');
          }}
          submitLabel="Actualizar"
        />
      </div>
    </DashboardLayout>
  );
}
