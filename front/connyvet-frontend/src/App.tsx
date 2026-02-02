// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';

// Guards
import { ProtectedRoute } from './router/ProtectedRoute';
import { AdminRoute } from './router/AdminRoute';

// Páginas públicas
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Dashboard principal
import { DashboardPage } from './pages/DashboardPage';

// TUTORES
import { TutoresListPage } from './tutores/TutoresListPage';
import { TutorCreatePage } from './tutores/TutorCreatePage';
import { TutorDetailPage } from './tutores/TutorDetailPage';

// PACIENTES
import { PatientListPage } from './clinic/pages/PatientListPage';
import { PatientCreatePage } from './clinic/pages/PatientCreatePage';
import { PatientEditPage } from './clinic/pages/PatientEditPage';
import { PatientDetailPage } from './clinic/pages/PatientDetailPage';

// CONSULTAS
import { ConsultationListPage } from './consultations/pages/ConsultationListPage';
import { ConsultationCreatePage } from './consultations/pages/ConsultationCreatePage';
import { ConsultationEditPage } from './consultations/pages/ConsultationEditPage';

// VACUNAS: aplicaciones (agenda)
import { VaccineApplicationListPage } from './vaccines/pages/VaccineApplicationListPage';
import { VaccineApplicationCreatePage } from './vaccines/pages/VaccineApplicationCreatePage';
import { VaccineApplicationEditPage } from './vaccines/pages/VaccineApplicationEditPage';

// VACUNAS: catálogo
import { VaccineCatalogListPage } from './vaccines/pages/VaccineCatalogListPage';
import { VaccineCatalogCreatePage } from './vaccines/pages/VaccineCatalogCreatePage';
import { VaccineCatalogEditPage } from './vaccines/pages/VaccineCatalogEditPage';

// ADMIN usuarios
import { AdminUserListPage } from './admin/users/pages/AdminUserListPage';
import { AdminUserCreatePage } from './admin/users/pages/AdminUserCreatePage';
import { AdminUserEditPage } from './admin/users/pages/AdminUserEditPage';

// INTERNACIONES
import { HospitalizationListPage } from './hospitalizations/pages/HospitalizationListPage';
import { HospitalizationCreatePage } from './hospitalizations/pages/HospitalizationCreatePage';
import { HospitalizationEditPage } from './hospitalizations/pages/HospitalizationEditPage';

// Ficha clínica
import { ClinicalRecordDetailPage } from './clinical-records/pages/ClinicalRecordDetailPage';

// PAGOS
import { PaymentListPage } from './payments/pages/PaymentListPage';
import { PaymentCreatePage } from './payments/pages/PaymentCreatePage';
import { PaymentEditPage } from './payments/pages/PaymentEditPage';

// Agenda clínica
import { AgendaPage } from './agenda/AgendaPage';
import { PaymentDetailPage } from './payments/pages/PaymentDetailPage';
import { BudgetListPage } from './budgets/pages/BudgetListPage';
import { BudgetCreatePage } from './budgets/pages/BudgetCreatePage';
import { BudgetDetailPage } from './budgets/pages/BudgetDetailPage';

/** Redirige /presupuestos/:id/editar al detalle (no existe BudgetEditPage aún). */
function BudgetEditRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/dashboard/presupuestos/${id}` : '/dashboard/presupuestos'} replace />;
}






function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* RUTAS PÚBLICAS */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* DASHBOARD HOME */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* TUTORES */}
          <Route
            path="/dashboard/tutores"
            element={
              <ProtectedRoute>
                <TutoresListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/tutores/nuevo"
            element={
              <ProtectedRoute>
                <TutorCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/tutores/:id"
            element={
              <ProtectedRoute>
                <TutorDetailPage />
              </ProtectedRoute>
            }
          />

          {/* PACIENTES */}
          <Route
            path="/dashboard/pacientes"
            element={
              <ProtectedRoute>
                <PatientListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/pacientes/nuevo"
            element={
              <ProtectedRoute>
                <PatientCreatePage />
              </ProtectedRoute>
            }
          />
          {/* Detalle de paciente (ficha con resumen clínico, vacunas, consultas) */}
          <Route
            path="/dashboard/pacientes/:id"
            element={
              <ProtectedRoute>
                <PatientDetailPage />
              </ProtectedRoute>
            }
          />
          {/* Edición de paciente (formulario completo) */}
          <Route
            path="/dashboard/pacientes/:id/editar"
            element={
              <ProtectedRoute>
                <PatientEditPage />
              </ProtectedRoute>
            }
          />

          {/* CONSULTAS */}
          <Route
            path="/dashboard/consultas"
            element={
              <ProtectedRoute>
                <ConsultationListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/consultas/nueva"
            element={
              <ProtectedRoute>
                <ConsultationCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/consultas/:id"
            element={
              <ProtectedRoute>
                <ConsultationEditPage />
              </ProtectedRoute>
            }
          />

          {/* VACUNAS: APLICACIONES (agenda) */}
          <Route
            path="/dashboard/vacunas"
            element={
              <ProtectedRoute>
                <VaccineApplicationListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/vacunas/nueva"
            element={
              <ProtectedRoute>
                <VaccineApplicationCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/vacunas/:id"
            element={
              <ProtectedRoute>
                <VaccineApplicationEditPage />
              </ProtectedRoute>
            }
          />

          {/* VACUNAS: CATÁLOGO (solo ADMIN) */}
          <Route
            path="/dashboard/catalogo-vacunas"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <VaccineCatalogListPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/catalogo-vacunas/nueva"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <VaccineCatalogCreatePage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/catalogo-vacunas/:id"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <VaccineCatalogEditPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          {/* ADMIN USUARIOS */}
          <Route
            path="/dashboard/usuarios"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminUserListPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/usuarios/nuevo"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminUserCreatePage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/usuarios/:id"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminUserEditPage />
                </AdminRoute>
              </ProtectedRoute>
            }
          />

          {/* INTERNACIONES */}
          <Route
            path="/dashboard/internaciones"
            element={
              <ProtectedRoute>
                <HospitalizationListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/internaciones/nueva"
            element={
              <ProtectedRoute>
                <HospitalizationCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/internaciones/:id"
            element={
              <ProtectedRoute>
                <HospitalizationEditPage />
              </ProtectedRoute>
            }
          />

          {/* FICHA CLÍNICA (vista consolidada por paciente) */}
          <Route
            path="/dashboard/fichas/:patientId"
            element={
              <ProtectedRoute>
                <ClinicalRecordDetailPage />
              </ProtectedRoute>
            }
          />
          {/* PAGOS */}
          <Route
            path="/dashboard/pagos"
            element={
              <ProtectedRoute>
                <PaymentListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/pagos/nuevo"
            element={
              <ProtectedRoute>
                <PaymentCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/pagos/:id"
            element={
              <ProtectedRoute>
                <PaymentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/pagos/:id/editar"
            element={
              <ProtectedRoute>
                <PaymentEditPage />
              </ProtectedRoute>
            }
          />
          {/* AGENDA CLÍNICA */}
          <Route
            path="/dashboard/agenda"
            element={
              <ProtectedRoute>
                <AgendaPage />
              </ProtectedRoute>
            }
          />

{/* PRESUPUESTOS */}
<Route
  path="/dashboard/presupuestos"
  element={
    <ProtectedRoute>
      <BudgetListPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/dashboard/presupuestos/nuevo"
  element={
    <ProtectedRoute>
      <BudgetCreatePage />
    </ProtectedRoute>
  }
/>

<Route
  path="/dashboard/presupuestos/:id"
  element={
    <ProtectedRoute>
      <BudgetDetailPage />
    </ProtectedRoute>
  }
/>

<Route
  path="/dashboard/presupuestos/:id/editar"
  element={
    <ProtectedRoute>
      <BudgetEditRedirect />
    </ProtectedRoute>
  }
/>






          {/* REDIRECCIONES */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
