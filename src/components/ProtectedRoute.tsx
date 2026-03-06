import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { isAdminUser } from '../types/entities'

type ProtectedRouteProps = {
  children: ReactNode
  allowedRoles?: Array<'admin' | 'client'>
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <main className="page-shell page-shell--loading">
        <section className="card">
          <p className="loading-placeholder">Loading account session...</p>
        </section>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (isAdminUser(user)) {
      return <Navigate to="/dashboard" replace />
    }

    return <Navigate to="/projects" replace />
  }

  return <>{children}</>
}
