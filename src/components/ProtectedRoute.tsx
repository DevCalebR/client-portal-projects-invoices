import { Navigate, useLocation } from 'react-router-dom'
import { type ReactNode, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { type OrganizationRole, isInternalRole } from '../types/entities'
import { logAppEvent } from '../utils/logger'

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
  const location = useLocation()
  const {
    user,
    organization,
    membership,
    loading,
    clerkLoaded,
    clerkOrgId,
    isSignedIn,
    isOrganizationSyncing,
  } = useAuth()

  let routeState = 'ready'

  if (!clerkLoaded || loading || isOrganizationSyncing) {
    routeState = 'loading'
  } else if (!isSignedIn || !user) {
    routeState = 'redirect_sign_in'
  } else if (requireOrganization && !organization) {
    routeState = 'redirect_onboarding'
  } else if (allowedRoles && membership && !allowedRoles.includes(membership.role)) {
    routeState = isInternalRole(membership.role) ? 'redirect_dashboard' : 'redirect_invoices'
  }

  useEffect(() => {
    logAppEvent('auth.protected_route', {
      path: location.pathname,
      routeState,
      requireOrganization,
      allowedRoles: allowedRoles ?? null,
      clerkLoaded,
      loading,
      isSignedIn,
      clerkOrgId,
      sessionOrgId: organization?.clerkOrganizationId ?? null,
      membershipRole: membership?.role ?? null,
      isOrganizationSyncing,
    })
  }, [
    location.pathname,
    routeState,
    requireOrganization,
    allowedRoles,
    clerkLoaded,
    loading,
    isSignedIn,
    clerkOrgId,
    organization?.clerkOrganizationId,
    membership?.role,
    isOrganizationSyncing,
  ])

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
