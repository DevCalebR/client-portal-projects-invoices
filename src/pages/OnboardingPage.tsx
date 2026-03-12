import { CreateOrganization, OrganizationSwitcher } from '@clerk/react'
import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logAppEvent } from '../utils/logger'

export const OnboardingPage = () => {
  const {
    organization,
    clerkLoaded,
    clerkOrgId,
    loading,
    isOrganizationSyncing,
    organizationSyncError,
    refreshSession,
  } = useAuth()

  useEffect(() => {
    logAppEvent('auth.onboarding', {
      clerkLoaded,
      clerkOrgId,
      sessionOrgId: organization?.clerkOrganizationId ?? null,
      loading,
      isOrganizationSyncing,
      organizationSyncError,
    })
  }, [
    clerkLoaded,
    clerkOrgId,
    organization?.clerkOrganizationId,
    loading,
    isOrganizationSyncing,
    organizationSyncError,
  ])

  if (!clerkLoaded || loading || isOrganizationSyncing) {
    return (
      <main className="login-shell">
        <section className="card auth-card">
          <p className="eyebrow">Workspace onboarding</p>
          <h1>Finishing your workspace setup</h1>
          <p className="auth-copy">
            Your organization was selected. The workspace is syncing and you will be redirected automatically.
          </p>
        </section>
      </main>
    )
  }

  if (organization) {
    return <Navigate to="/dashboard" replace />
  }

  if (clerkOrgId && organizationSyncError) {
    return (
      <main className="login-shell">
        <section className="card auth-card">
          <p className="eyebrow">Workspace onboarding</p>
          <h1>We could not load the selected workspace</h1>
          <p className="auth-copy">
            The organization is selected in Clerk, but the application session could not finish syncing it.
          </p>
          <div className="form-actions">
            <button className="btn btn--primary" type="button" onClick={() => void refreshSession()}>
              Retry workspace sync
            </button>
          </div>
          <p className="muted">{organizationSyncError}</p>
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
