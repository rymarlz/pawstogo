// // src/AppRouter.tsx
// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { AuthProvider } from './auth/AuthContext';

// import { ProtectedRoute } from './router/ProtectedRoute';
// import { AdminRoute } from './router/AdminRoute';

// // Páginas públicas
// import { LoginPage } from './pages/LoginPage';

// // Dashboard principal
// import { DashboardPage } from './pages/DashboardPage';

// // Tutores
// import { TutoresListPage } from './tutores/TutoresListPage';

// // Admin: usuarios y roles
// import { AdminUserListPage } from './admin/users/pages/AdminUserListPage';
// import { AdminUserCreatePage } from './admin/users/pages/AdminUserCreatePage';
// import {  AdminUserEditPage} from './admin/users/pages/AdminUserEditPage';

// export function AppRouter() {
//   return (
//     <BrowserRouter>
//       <AuthProvider>
//         <Routes>
//           {/* Pública */}
//           <Route path="/login" element={<LoginPage />} />

//           {/* Dashboard (protegido) */}
//           <Route
//             path="/dashboard"
//             element={
//               <ProtectedRoute>
//                 <DashboardPage />
//               </ProtectedRoute>
//             }
//           />

//           {/* Tutores (protegido) */}
//           <Route
//             path="/dashboard/tutores"
//             element={
//               <ProtectedRoute>
//                 <TutoresListPage />
//               </ProtectedRoute>
//             }
//           />

//           {/* ===========================
//               RUTAS ADMIN (usuarios y roles)
//              =========================== */}
//           <Route
//             path="/dashboard/usuarios"
//             element={
//               <ProtectedRoute>
//                 <AdminRoute>
//                   <AdminUserListPage />
//                 </AdminRoute>
//               </ProtectedRoute>
//             }
//           />
//           <Route
//             path="/dashboard/usuarios/nuevo"
//             element={
//               <ProtectedRoute>
//                 <AdminRoute>
//                   <AdminUserCreatePage />
//                 </AdminRoute>
//               </ProtectedRoute>
//             }
//           />
//           <Route
//             path="/dashboard/usuarios/:id"
//             element={
//               <ProtectedRoute>
//                 <AdminRoute>
//                   <AdminUserEditPage />
//                 </AdminRoute>
//               </ProtectedRoute>
//             }
//           />

//           {/* Fallback: cualquier otra ruta → login */}
//           <Route path="*" element={<Navigate to="/login" replace />} />
//         </Routes>
//       </AuthProvider>
//     </BrowserRouter>
//   );
// }
