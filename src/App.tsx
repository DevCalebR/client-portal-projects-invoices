import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

const DashboardPage = lazy(async () => ({ default: (await import('./pages/DashboardPage')).DashboardPage }))
const InvoiceDetailPage = lazy(async () => ({ default: (await import('./pages/InvoiceDetailPage')).InvoiceDetailPage }))
const InvoiceFormPage = lazy(async () => ({ default: (await import('./pages/InvoiceFormPage')).InvoiceFormPage }))
const InvoicesPage = lazy(async () => ({ default: (await import('./pages/InvoicesPage')).InvoicesPage }))
const LoginPage = lazy(async () => ({ default: (await import('./pages/LoginPage')).LoginPage }))
const NotFoundPage = lazy(async () => ({ default: (await import('./pages/NotFoundPage')).NotFoundPage }))
const OnboardingPage = lazy(async () => ({ default: (await import('./pages/OnboardingPage')).OnboardingPage }))
const ProjectDetailPage = lazy(async () => ({ default: (await import('./pages/ProjectDetailPage')).ProjectDetailPage }))
const ProjectFormPage = lazy(async () => ({ default: (await import('./pages/ProjectFormPage')).ProjectFormPage }))
const ProjectsPage = lazy(async () => ({ default: (await import('./pages/ProjectsPage')).ProjectsPage }))
const SettingsPage = lazy(async () => ({ default: (await import('./pages/SettingsPage')).SettingsPage }))
const SignUpPage = lazy(async () => ({ default: (await import('./pages/SignUpPage')).SignUpPage }))

const RouteFallback = () => (
  <section className="card">
    <p className="loading-placeholder">Loading page…</p>
  </section>
)

const withSuspense = (element: ReactNode) => (
  <Suspense fallback={<RouteFallback />}>{element}</Suspense>
)

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/sign-in" replace />} />
      <Route path="/sign-in/*" element={withSuspense(<LoginPage />)} />
      <Route path="/sign-up/*" element={withSuspense(<SignUpPage />)} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requireOrganization={false} allowPendingWorkspace>
            {withSuspense(<OnboardingPage />)}
          </ProtectedRoute>
        }
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
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              {withSuspense(<ProjectFormPage />)}
            </ProtectedRoute>
          }
        />
        <Route path="projects/:id" element={withSuspense(<ProjectDetailPage />)} />
        <Route
          path="projects/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              {withSuspense(<ProjectFormPage />)}
            </ProtectedRoute>
          }
        />
        <Route path="invoices" element={withSuspense(<InvoicesPage />)} />
        <Route
          path="invoices/new"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              {withSuspense(<InvoiceFormPage />)}
            </ProtectedRoute>
          }
        />
        <Route path="invoices/:id" element={withSuspense(<InvoiceDetailPage />)} />
        <Route
          path="invoices/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
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
