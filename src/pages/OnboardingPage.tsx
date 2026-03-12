import { CreateOrganization, OrganizationSwitcher } from '@clerk/react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { AuthDebugPanel } from '../components/AuthDebugPanel'
import { TrackedNavigate } from '../components/TrackedNavigate'
import { useAuth } from '../context/AuthContext'
import { logAppEvent } from '../utils/logger'

export const OnboardingPage = () => {
  const location = useLocation()
  const {
    organization,
    user,
    clerkLoaded,
    clerkOrgId,
    clerkActiveOrganization,
    loading,
    isSignedIn,
    isOrganizationSyncing,
    isWorkspaceReady,
    sessionSyncState,
    organizationSyncError,
    lastSessionSnapshot,
    refreshSession,
  } = useAuth()

  const shouldWaitForWorkspace =
    !clerkLoaded
    || loading
    || (Boolean(clerkOrgId) && (sessionSyncState === 'loading' || sessionSyncState === 'partial'))

  const shouldShowSyncError =
    Boolean(clerkOrgId)
    && sessionSyncState === 'error'
    && !organization

  useEffect(() => {
    logAppEvent('auth.onboarding', {
      route: location.pathname,
      isLoaded: clerkLoaded,
      isSignedIn,
      userId: user?.clerkUserId ?? null,
      organization: organization
        ? {
            id: organization.id,
            clerkOrganizationId: organization.clerkOrganizationId,
            slug: organization.slug,
            name: organization.name,
          }
        : null,
      organizationId: clerkOrgId,
      activeOrganization: clerkActiveOrganization,
      loading,
      isOrganizationSyncing,
      isWorkspaceReady,
      sessionSyncState,
      organizationSyncError,
      redirectDestination: organization && isWorkspaceReady ? '/dashboard' : null,
      sessionMeta: lastSessionSnapshot?.meta ?? null,
    })
  }, [
    clerkActiveOrganization,
    clerkLoaded,
    clerkOrgId,
    isOrganizationSyncing,
    isSignedIn,
    isWorkspaceReady,
    lastSessionSnapshot?.meta,
    loading,
    location.pathname,
    organization,
    organizationSyncError,
    sessionSyncState,
    user?.clerkUserId,
  ])

  if (shouldWaitForWorkspace) {
    return (
      <main className="login-shell">
        <section className="card auth-card">
          <p className="eyebrow">Workspace onboarding</p>
          <h1>Finishing your workspace setup</h1>
          <p className="auth-copy">
            Your organization was selected. The application is waiting for the workspace session to finish syncing.
          </p>
        </section>
      </main>
    )
  }

  if (organization && isWorkspaceReady) {
    return <TrackedNavigate to="/dashboard" reason="workspace_ready" />
  }

  if (shouldShowSyncError) {
    return (
      <main className="login-shell">
        <AuthDebugPanel
          title="Workspace sync stalled"
          message={organizationSyncError ?? 'The selected organization did not become a ready application session.'}
          redirectDestination="/dashboard"
        />
        <section className="card auth-card">
          <p className="muted">
            The Clerk organization is selected, but the backend session is still incomplete. Use the debug panel above
            to inspect the session payload and retry the sync.
          </p>
          <div className="form-actions">
            <button className="btn btn--primary" type="button" onClick={() => void refreshSession()}>
              Retry workspace sync
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="login-shell">
      <section className="auth-shell">
        <div className="auth-copy-block">
          <p className="eyebrow">Workspace onboarding</p>
          <h1>Create or select an organization</h1>
          <p className="auth-copy">
            Every project, invoice, member, and payment is scoped to a Clerk organization. Create one to continue.
          </p>
          <div className="inline-actions">
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl="/onboarding"
              afterCreateOrganizationUrl="/onboarding"
            />
          </div>
        </div>
        <CreateOrganization
          routing="path"
          path="/onboarding"
          skipInvitationScreen={false}
          afterCreateOrganizationUrl="/onboarding"
        />
      </section>
    </main>
  )
}
