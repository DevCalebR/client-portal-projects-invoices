import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth as useClerkAuth, useOrganization } from '@clerk/react'
import { useAuth as useAppAuth } from '../context/AuthContext'
import { logAppEvent } from '../utils/logger'

export const AppBootstrapObserver = () => {
  const location = useLocation()
  const { isLoaded, isSignedIn, userId, orgId } = useClerkAuth()
  const { organization: activeOrganization } = useOrganization()
  const {
    organization,
    loading,
    sessionSyncState,
    isOrganizationSyncing,
    isWorkspaceReady,
    organizationSyncError,
    lastSessionSnapshot,
  } = useAppAuth()

  useEffect(() => {
    logAppEvent('auth.main', {
      route: location.pathname,
      isLoaded,
      isSignedIn,
      userId,
      organization,
      organizationId: orgId ?? null,
      activeOrganization: activeOrganization
        ? {
            id: activeOrganization.id,
            slug: activeOrganization.slug ?? null,
            name: activeOrganization.name,
          }
        : null,
      loading,
      isOrganizationSyncing,
      isWorkspaceReady,
      sessionSyncState,
      organizationSyncError,
      redirectDestination: null,
      sessionMeta: lastSessionSnapshot?.meta ?? null,
    })
  }, [
    activeOrganization,
    isLoaded,
    isOrganizationSyncing,
    isSignedIn,
    isWorkspaceReady,
    lastSessionSnapshot?.meta,
    loading,
    location.pathname,
    orgId,
    organization,
    organizationSyncError,
    sessionSyncState,
    userId,
  ])

  return null
}
