/* eslint-disable react-refresh/only-export-components */
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth as useClerkAuth } from '@clerk/react'
import { apiFetch } from '../lib/api'
import type { AppSession, OrganizationRole, TeamInviteInput } from '../types/entities'
import { logAppError, logAppEvent } from '../utils/logger'

interface AuthContextType extends AppSession {
  loading: boolean
  clerkLoaded: boolean
  clerkOrgId: string | null
  isSignedIn: boolean
  isOrganizationSyncing: boolean
  organizationSyncError: string | null
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
  inviteTeamMember: (input: TeamInviteInput) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const emptySession: AppSession = {
  user: null,
  organization: null,
  membership: null,
  clientProfile: null,
  members: [],
  invitations: [],
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, userId, orgId, signOut } = useClerkAuth()
  const [session, setSession] = useState<AppSession>(emptySession)
  const [loading, setLoading] = useState(true)
  const [resolvedClerkOrgId, setResolvedClerkOrgId] = useState<string | null>(null)
  const [organizationSyncError, setOrganizationSyncError] = useState<string | null>(null)
  const latestRequestIdRef = useRef(0)
  const latestClerkOrgIdRef = useRef<string | null>(orgId ?? null)

  useEffect(() => {
    latestClerkOrgIdRef.current = orgId ?? null
  }, [orgId])

  const refreshSession = useCallback(async () => {
    if (!isLoaded) {
      return
    }

    if (!isSignedIn || !userId) {
      setSession(emptySession)
      setResolvedClerkOrgId(null)
      setOrganizationSyncError(null)
      setLoading(false)
      return
    }

    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    const requestedOrgId = latestClerkOrgIdRef.current

    setLoading(true)
    setOrganizationSyncError(null)
    logAppEvent('auth.refresh_session.start', {
      requestId,
      userId,
      requestedOrgId,
      isSignedIn,
    })

    try {
      const nextSession = await apiFetch<AppSession>('/api/auth/session')
      const isStaleRequest =
        requestId !== latestRequestIdRef.current
        || requestedOrgId !== latestClerkOrgIdRef.current

      if (isStaleRequest) {
        logAppEvent('auth.refresh_session.stale', {
          requestId,
          requestedOrgId,
          latestOrgId: latestClerkOrgIdRef.current,
          sessionOrgId: nextSession.organization?.clerkOrganizationId ?? null,
        })
        return
      }

      setSession(nextSession)
      setResolvedClerkOrgId(requestedOrgId)
      setOrganizationSyncError(null)
      logAppEvent('auth.refresh_session.success', {
        requestId,
        requestedOrgId,
        sessionOrgId: nextSession.organization?.clerkOrganizationId ?? null,
        hasMembership: Boolean(nextSession.membership),
      })
    } catch (error) {
      logAppError(error, {
        scope: 'AuthProvider.refreshSession',
        requestId,
        requestedOrgId,
      })

      if (requestId === latestRequestIdRef.current) {
        setSession((currentSession) => ({
          ...currentSession,
          organization: null,
          membership: null,
          clientProfile: null,
          members: [],
          invitations: [],
        }))
        setResolvedClerkOrgId(requestedOrgId)
        setOrganizationSyncError(error instanceof Error ? error.message : 'Unable to load the selected workspace.')
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false)
      }
    }
  }, [isLoaded, isSignedIn, userId])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession, orgId])

  const isOrganizationSyncing =
    Boolean(isLoaded && isSignedIn && orgId)
    && resolvedClerkOrgId !== orgId

  useEffect(() => {
    logAppEvent('auth.state', {
      isLoaded,
      isSignedIn,
      userId,
      clerkOrgId: orgId ?? null,
      sessionOrgId: session.organization?.clerkOrganizationId ?? null,
      resolvedClerkOrgId,
      loading,
      isOrganizationSyncing,
      organizationSyncError,
    })
  }, [
    isLoaded,
    isSignedIn,
    userId,
    orgId,
    session.organization?.clerkOrganizationId,
    resolvedClerkOrgId,
    loading,
    isOrganizationSyncing,
    organizationSyncError,
  ])

  const logout = useCallback(async () => {
    await signOut({
      redirectUrl: '/sign-in',
    })
  }, [signOut])

  const inviteTeamMember = useCallback(async (input: TeamInviteInput) => {
    await apiFetch<{ invitation: { id: string } }>('/api/organizations/invitations', {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        role: input.role as OrganizationRole,
      }),
    })
    await refreshSession()
  }, [refreshSession])

  const value = useMemo(
    () => ({
      ...session,
      loading,
      clerkLoaded: isLoaded,
      clerkOrgId: orgId ?? null,
      isSignedIn: Boolean(isSignedIn),
      isOrganizationSyncing,
      organizationSyncError,
      refreshSession,
      logout,
      inviteTeamMember,
    }),
    [
      session,
      loading,
      isLoaded,
      orgId,
      isSignedIn,
      isOrganizationSyncing,
      organizationSyncError,
      refreshSession,
      logout,
      inviteTeamMember,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
