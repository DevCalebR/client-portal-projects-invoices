import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { InvoiceFormPage } from './pages/InvoiceFormPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectFormPage } from './pages/ProjectFormPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingsPage } from './pages/SettingsPage'
import { useAuth } from './context/AuthContext'

function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="" element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/new" element={<ProtectedRoute allowedRoles={["admin"]}><ProjectFormPage /></ProtectedRoute>} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route
          path="projects/:id/edit"
          element={<ProtectedRoute allowedRoles={["admin"]}><ProjectFormPage /></ProtectedRoute>}
        />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route
          path="invoices/new"
          element={<ProtectedRoute allowedRoles={["admin"]}><InvoiceFormPage /></ProtectedRoute>}
        />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route
          path="invoices/:id/edit"
          element={<ProtectedRoute allowedRoles={["admin"]}><InvoiceFormPage /></ProtectedRoute>}
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
