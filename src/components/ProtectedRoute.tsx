import { type ReactNode, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AuthDebugPanel } from './AuthDebugPanel'
import { TrackedNavigate } from './TrackedNavigate'
import { useAuth } from '../context/AuthContext'
import { type OrganizationRole, isInternalRole } from '../types/entities'
import { logAppEvent } from '../utils/logger'

type ProtectedRouteProps = {
  children: ReactNode
  allowedRoles?: OrganizationRole[]
  requireOrganization?: boolean
  allowPendingWorkspace?: boolean
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
  requireOrganization = true,
  allowPendingWorkspace = false,
}: ProtectedRouteProps) => {
  const location = useLocation()
  const {
    user,
    organization,
    membership,
    loading,
    clerkLoaded,
    clerkOrgId,
    clerkActiveOrganization,
    isSignedIn,
    isOrganizationSyncing,
    isWorkspaceReady,
    sessionSyncState,
    organizationSyncError,
    lastSessionSnapshot,
  } = useAuth()

  let routeState = 'ready'
  let redirectDestination: string | null = null
  let redirectReason: string | null = null

  if (!clerkLoaded || loading || (!allowPendingWorkspace && isOrganizationSyncing)) {
    routeState = 'loading'
  } else if (!isSignedIn || !user) {
    routeState = 'redirect_sign_in'
    redirectDestination = '/sign-in'
    redirectReason = 'user_not_signed_in'
  } else if (requireOrganization && !clerkOrgId) {
    routeState = 'redirect_onboarding'
    redirectDestination = '/onboarding'
    redirectReason = 'organization_not_selected'
  } else if (requireOrganization && !organization && sessionSyncState === 'error') {
    routeState = 'workspace_error'
  } else if (requireOrganization && !organization) {
    routeState = 'loading'
  } else if (allowedRoles && membership && !allowedRoles.includes(membership.role)) {
    routeState = isInternalRole(membership.role) ? 'redirect_dashboard' : 'redirect_invoices'
    redirectDestination = isInternalRole(membership.role) ? '/dashboard' : '/invoices'
    redirectReason = 'role_not_allowed'
  }

  useEffect(() => {
    logAppEvent('auth.protected_route', {
      path: location.pathname,
      routeState,
      requireOrganization,
      allowPendingWorkspace,
      allowedRoles: allowedRoles ?? null,
      redirectDestination,
      redirectReason,
      clerkLoaded,
      loading,
      isSignedIn,
      userId: user?.clerkUserId ?? null,
      clerkOrgId,
      activeOrganization: clerkActiveOrganization,
      sessionOrgId: organization?.clerkOrganizationId ?? null,
      membershipRole: membership?.role ?? null,
      isOrganizationSyncing,
      isWorkspaceReady,
      sessionSyncState,
      organizationSyncError,
      sessionMeta: lastSessionSnapshot?.meta ?? null,
    })
  }, [
    allowedRoles,
    allowPendingWorkspace,
    clerkActiveOrganization,
    clerkLoaded,
    clerkOrgId,
    isOrganizationSyncing,
    isSignedIn,
    isWorkspaceReady,
    lastSessionSnapshot?.meta,
    loading,
    location.pathname,
    membership?.role,
    organization?.clerkOrganizationId,
    organizationSyncError,
    redirectDestination,
    redirectReason,
    requireOrganization,
    routeState,
    sessionSyncState,
    user?.clerkUserId,
  ])

  if (!clerkLoaded || loading || (!allowPendingWorkspace && isOrganizationSyncing)) {
    return (
      <section className="card">
        <p className="loading-placeholder">Loading your workspace...</p>
      </section>
    )
  }

  if (routeState === 'workspace_error') {
    return (
      <AuthDebugPanel
        title="Workspace session failed to initialize"
        message="The selected Clerk organization never became a ready application session. Redirects are paused so you can inspect the current auth and session state."
        redirectDestination="/dashboard"
      />
    )
  }

  if (redirectDestination && redirectReason) {
    return <TrackedNavigate to={redirectDestination} reason={redirectReason} />
  }

  return <>{children}</>
}
