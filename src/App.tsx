import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'

const DashboardPage = lazy(async () => ({ default: (await import('./pages/DashboardPage')).DashboardPage }))
const InvoiceDetailPage = lazy(async () => ({ default: (await import('./pages/InvoiceDetailPage')).InvoiceDetailPage }))
const InvoiceFormPage = lazy(async () => ({ default: (await import('./pages/InvoiceFormPage')).InvoiceFormPage }))
const InvoicesPage = lazy(async () => ({ default: (await import('./pages/InvoicesPage')).InvoicesPage }))
const LoginPage = lazy(async () => ({ default: (await import('./pages/LoginPage')).LoginPage }))
const NotFoundPage = lazy(async () => ({ default: (await import('./pages/NotFoundPage')).NotFoundPage }))
const ProjectDetailPage = lazy(async () => ({ default: (await import('./pages/ProjectDetailPage')).ProjectDetailPage }))
const ProjectFormPage = lazy(async () => ({ default: (await import('./pages/ProjectFormPage')).ProjectFormPage }))
const ProjectsPage = lazy(async () => ({ default: (await import('./pages/ProjectsPage')).ProjectsPage }))
const SettingsPage = lazy(async () => ({ default: (await import('./pages/SettingsPage')).SettingsPage }))

const RouteFallback = () => (
  <section className="card">
    <p className="loading-placeholder">Loading page…</p>
  </section>
)

const withSuspense = (element: ReactNode) => (
  <Suspense fallback={<RouteFallback />}>
    {element}
  </Suspense>
)

function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : withSuspense(<LoginPage />)}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="" element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={withSuspense(<DashboardPage />)} />
        <Route path="projects" element={withSuspense(<ProjectsPage />)} />
        <Route
          path="projects/new"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              {withSuspense(<ProjectFormPage />)}
            </ProtectedRoute>
          }
        />
        <Route path="projects/:id" element={withSuspense(<ProjectDetailPage />)} />
        <Route
          path="projects/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              {withSuspense(<ProjectFormPage />)}
            </ProtectedRoute>
          }
        />
        <Route path="invoices" element={withSuspense(<InvoicesPage />)} />
        <Route
          path="invoices/new"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              {withSuspense(<InvoiceFormPage />)}
            </ProtectedRoute>
          }
        />
        <Route path="invoices/:id" element={withSuspense(<InvoiceDetailPage />)} />
        <Route
          path="invoices/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              {withSuspense(<InvoiceFormPage />)}
            </ProtectedRoute>
          }
        />
        <Route path="settings" element={withSuspense(<SettingsPage />)} />
      </Route>
      <Route path="*" element={withSuspense(<NotFoundPage />)} />
    </Routes>
  )
}

export default App
