import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type AuthDebugPanelProps = {
  title: string
  message: string
  redirectDestination?: string | null
}

export const AuthDebugPanel = ({
  title,
  message,
  redirectDestination = null,
}: AuthDebugPanelProps) => {
  const location = useLocation()
  const {
    clerkLoaded,
    isSignedIn,
    user,
    clerkOrgId,
    clerkActiveOrganization,
    organization,
    membership,
    loading,
    isOrganizationSyncing,
    isWorkspaceReady,
    sessionSyncState,
    organizationSyncError,
    lastSessionSnapshot,
    redirectLoopState,
    refreshSession,
    clearRedirectLoop,
  } = useAuth()

  const debugState = useMemo(
    () => ({
      route: location.pathname,
      redirectDestination,
      auth: {
        isLoaded: clerkLoaded,
        isSignedIn,
        userId: user?.clerkUserId ?? null,
        userEmail: user?.email ?? null,
      },
      clerk: {
        organizationId: clerkOrgId,
        activeOrganization: clerkActiveOrganization,
      },
      workspace: {
        sessionOrganization: organization,
        membership,
        loading,
        isOrganizationSyncing,
        isWorkspaceReady,
        sessionSyncState,
        organizationSyncError,
      },
      redirectLoop: redirectLoopState,
      session: lastSessionSnapshot,
    }),
    [
      clerkActiveOrganization,
      clerkLoaded,
      clerkOrgId,
      isOrganizationSyncing,
      isSignedIn,
      isWorkspaceReady,
      lastSessionSnapshot,
      loading,
      location.pathname,
      membership,
      organization,
      organizationSyncError,
      redirectDestination,
      redirectLoopState,
      sessionSyncState,
      user?.clerkUserId,
      user?.email,
    ],
  )

  return (
    <section className="card debug-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Workspace debug</p>
          <h2>{title}</h2>
          <p className="muted">{message}</p>
        </div>
      </div>
      <pre className="debug-panel__pre">{JSON.stringify(debugState, null, 2)}</pre>
      <div className="form-actions">
        <button className="btn btn--primary" type="button" onClick={() => void refreshSession()}>
          Retry session sync
        </button>
        <button className="btn btn--ghost" type="button" onClick={clearRedirectLoop}>
          Clear redirect guard
        </button>
      </div>
    </section>
  )
}
