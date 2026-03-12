import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { type OrganizationRole, isInternalRole } from '../types/entities'

type ProtectedRouteProps = {
  children: ReactNode
  allowedRoles?: OrganizationRole[]
  requireOrganization?: boolean
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
  requireOrganization = true,
}: ProtectedRouteProps) => {
  const {
    user,
    organization,
    membership,
    loading,
    clerkLoaded,
    isSignedIn,
    isOrganizationSyncing,
  } = useAuth()

  if (!clerkLoaded || loading || isOrganizationSyncing) {
    return (
      <section className="card">
        <p className="loading-placeholder">Loading your workspace...</p>
      </section>
    )
  }

  if (!isSignedIn || !user) {
    return <Navigate to="/sign-in" replace />
  }

  if (requireOrganization && !organization) {
    return <Navigate to="/onboarding" replace />
  }

  if (allowedRoles && membership && !allowedRoles.includes(membership.role)) {
    if (isInternalRole(membership.role)) {
      return <Navigate to="/dashboard" replace />
    }

    return <Navigate to="/invoices" replace />
  }

  return <>{children}</>
}
