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
import { useAuth as useClerkAuth, useOrganization } from '@clerk/react'
import { apiFetch } from '../lib/api'
import type {
  AppSession,
  OrganizationRole,
  SessionMeta,
  TeamInviteInput,
} from '../types/entities'
import { logAppError, logAppEvent } from '../utils/logger'

type SessionSyncState = 'idle' | 'loading' | 'ready' | 'partial' | 'error'

type ClerkOrganizationSummary = {
  id: string
  name: string
  slug: string | null
}

type RedirectAttemptInput = {
  from: string
  to: string
  reason: string
  route: string
}

export type RedirectAttempt = RedirectAttemptInput & {
  timestamp: string
}

type RedirectLoopPreview = {
  blocked: boolean
  attempts: RedirectAttempt[]
}

type RedirectLoopState = RedirectLoopPreview

interface AuthContextType extends AppSession {
  loading: boolean
  clerkLoaded: boolean
  clerkOrgId: string | null
  clerkActiveOrganization: ClerkOrganizationSummary | null
  isSignedIn: boolean
  isOrganizationSyncing: boolean
  isWorkspaceReady: boolean
  sessionSyncState: SessionSyncState
  organizationSyncError: string | null
  lastSessionSnapshot: AppSession | null
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
  inviteTeamMember: (input: TeamInviteInput) => Promise<void>
  getRedirectLoopPreview: (attempt: RedirectAttemptInput) => RedirectLoopPreview
  registerRedirectAttempt: (attempt: RedirectAttemptInput) => RedirectLoopState
  clearRedirectLoop: () => void
  redirectLoopState: RedirectLoopState
}

const MAX_SESSION_SYNC_RETRIES = 4
const REDIRECT_LOOP_LIMIT = 3
const REDIRECT_LOOP_WINDOW_MS = 2_000

const createSessionMeta = (overrides: Partial<SessionMeta> = {}): SessionMeta => ({
  ready: true,
  source: 'complete',
  authUserId: null,
  authOrgId: null,
  authOrgRole: null,
  requestedOrgId: null,
  error: null,
  errorCode: null,
  syncedAt: new Date().toISOString(),
  ...overrides,
})

const emptySession: AppSession = {
  user: null,
  organization: null,
  membership: null,
  clientProfile: null,
  members: [],
  invitations: [],
  meta: createSessionMeta(),
}

const emptyRedirectLoopState: RedirectLoopState = {
  blocked: false,
  attempts: [],
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const formatOrgMismatchMessage = (requestedOrgId: string, sessionOrgId: string | null) =>
  `Selected organization ${requestedOrgId} is not synced yet. Session organization: ${sessionOrgId ?? 'none'}.`

const buildRedirectLoopState = (
  currentState: RedirectLoopState,
  attempt: RedirectAttemptInput,
  timestamp = Date.now(),
): RedirectLoopState => {
  const recentAttempts = currentState.attempts.filter(
    (entry) => timestamp - Date.parse(entry.timestamp) <= REDIRECT_LOOP_WINDOW_MS,
  )
  const lastAttempt = recentAttempts.at(-1)
  const isDuplicateAttempt =
    lastAttempt
      ? lastAttempt.from === attempt.from
        && lastAttempt.to === attempt.to
        && lastAttempt.reason === attempt.reason
        && timestamp - Date.parse(lastAttempt.timestamp) <= 150
      : false

  const attempts = isDuplicateAttempt
    ? recentAttempts
    : [
        ...recentAttempts,
        {
          ...attempt,
          timestamp: new Date(timestamp).toISOString(),
        },
      ]

  return {
    blocked: attempts.length > REDIRECT_LOOP_LIMIT,
    attempts,
  }
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
  const { organization: activeOrganization } = useOrganization()
  const [session, setSession] = useState<AppSession>(emptySession)
  const [loading, setLoading] = useState(true)
  const [sessionSyncState, setSessionSyncState] = useState<SessionSyncState>('idle')
  const [organizationSyncError, setOrganizationSyncError] = useState<string | null>(null)
  const [lastSessionSnapshot, setLastSessionSnapshot] = useState<AppSession | null>(null)
  const [redirectLoopState, setRedirectLoopState] = useState<RedirectLoopState>(emptyRedirectLoopState)
  const latestRequestIdRef = useRef(0)
  const latestClerkOrgIdRef = useRef<string | null>(orgId ?? null)
  const syncRetryCountRef = useRef(0)
  const redirectLoopStateRef = useRef<RedirectLoopState>(emptyRedirectLoopState)
  const sessionRef = useRef<AppSession>(emptySession)

  const clerkActiveOrganization = useMemo<ClerkOrganizationSummary | null>(
    () =>
      activeOrganization
        ? {
            id: activeOrganization.id,
            name: activeOrganization.name,
            slug: activeOrganization.slug ?? null,
          }
        : null,
    [activeOrganization],
  )

  useEffect(() => {
    latestClerkOrgIdRef.current = orgId ?? null
  }, [orgId])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  const getRedirectLoopPreview = useCallback((attempt: RedirectAttemptInput) => {
    return buildRedirectLoopState(redirectLoopStateRef.current, attempt)
  }, [])

  const registerRedirectAttempt = useCallback((attempt: RedirectAttemptInput) => {
    const nextState = buildRedirectLoopState(redirectLoopStateRef.current, attempt)
    redirectLoopStateRef.current = nextState
    setRedirectLoopState(nextState)
    logAppEvent('auth.redirect_attempt', {
      route: attempt.route,
      from: attempt.from,
      to: attempt.to,
      reason: attempt.reason,
      blocked: nextState.blocked,
      attempts: nextState.attempts,
    })
    return nextState
  }, [])

  const clearRedirectLoop = useCallback(() => {
    redirectLoopStateRef.current = emptyRedirectLoopState
    setRedirectLoopState(emptyRedirectLoopState)
  }, [])

  const refreshSession = useCallback(async () => {
    if (!isLoaded) {
      return
    }

    if (!isSignedIn || !userId) {
      setSession(emptySession)
      setLastSessionSnapshot(emptySession)
      setSessionSyncState('ready')
      setOrganizationSyncError(null)
      setLoading(false)
      clearRedirectLoop()
      return
    }

    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    const requestedOrgId = latestClerkOrgIdRef.current

    setLoading(true)
    setSessionSyncState('loading')
    setOrganizationSyncError(null)
    logAppEvent('auth.refresh_session.start', {
      requestId,
      userId,
      requestedOrgId,
      isSignedIn,
      activeOrganization: clerkActiveOrganization,
    })

    try {
      const response = await apiFetch<AppSession>('/api/auth/session')
      const isStaleRequest =
        requestId !== latestRequestIdRef.current || requestedOrgId !== latestClerkOrgIdRef.current

      if (isStaleRequest) {
        logAppEvent('auth.refresh_session.stale', {
          requestId,
          requestedOrgId,
          latestOrgId: latestClerkOrgIdRef.current,
          sessionOrgId: response.organization?.clerkOrganizationId ?? null,
        })
        return
      }

      const sessionOrgId = response.organization?.clerkOrganizationId ?? null
      const serverMeta = createSessionMeta({
        ...response.meta,
        authUserId: response.meta?.authUserId ?? userId,
        authOrgId: response.meta?.authOrgId ?? requestedOrgId,
        requestedOrgId,
        syncedAt: response.meta?.syncedAt ?? new Date().toISOString(),
      })
      const matchesSelectedOrg = requestedOrgId ? sessionOrgId === requestedOrgId : sessionOrgId === null
      const isSessionReady = serverMeta.ready && matchesSelectedOrg
      const normalizedSession: AppSession = {
        ...response,
        meta: createSessionMeta({
          ...serverMeta,
          ready: isSessionReady,
          source: isSessionReady ? 'complete' : 'partial',
          error:
            serverMeta.error
            ?? (!isSessionReady && requestedOrgId ? formatOrgMismatchMessage(requestedOrgId, sessionOrgId) : null),
          errorCode:
            serverMeta.errorCode ?? (!isSessionReady && requestedOrgId ? 'SESSION_ORG_MISMATCH' : null),
        }),
      }

      setSession(normalizedSession)
      setLastSessionSnapshot(normalizedSession)

      if (isSessionReady) {
        setSessionSyncState('ready')
        setOrganizationSyncError(null)
        syncRetryCountRef.current = 0
        clearRedirectLoop()
        logAppEvent('auth.refresh_session.success', {
          requestId,
          requestedOrgId,
          sessionOrgId,
          membershipRole: normalizedSession.membership?.role ?? null,
        })
        return
      }

      setSessionSyncState('partial')
      setOrganizationSyncError(normalizedSession.meta?.error ?? null)
      logAppEvent('auth.refresh_session.partial', {
        requestId,
        requestedOrgId,
        sessionOrgId,
        meta: normalizedSession.meta,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unable to load the selected workspace.'
      const partialSession: AppSession = {
        ...sessionRef.current,
        meta: createSessionMeta({
          ready: false,
          source: 'partial',
          authUserId: userId,
          authOrgId: requestedOrgId,
          requestedOrgId,
          error: errorMessage,
          errorCode: 'SESSION_FETCH_FAILED',
        }),
      }

      logAppError(error, {
        scope: 'AuthProvider.refreshSession',
        requestId,
        requestedOrgId,
      })

      if (requestId === latestRequestIdRef.current) {
        setSession(partialSession)
        setLastSessionSnapshot(partialSession)
        setSessionSyncState('partial')
        setOrganizationSyncError(errorMessage)
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false)
      }
    }
  }, [clearRedirectLoop, clerkActiveOrganization, isLoaded, isSignedIn, userId])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession, orgId])

  useEffect(() => {
    if (sessionSyncState !== 'partial' || !isLoaded || !isSignedIn || !orgId) {
      if (sessionSyncState !== 'partial') {
        syncRetryCountRef.current = 0
      }
      return
    }

    if (syncRetryCountRef.current >= MAX_SESSION_SYNC_RETRIES) {
      setSessionSyncState('error')
      setOrganizationSyncError((current) =>
        current ?? 'The selected organization did not finish syncing into the application session.',
      )
      logAppEvent('auth.refresh_session.retry_exhausted', {
        orgId,
        attempts: syncRetryCountRef.current,
        sessionOrgId: session.organization?.clerkOrganizationId ?? null,
        lastSessionMeta: lastSessionSnapshot?.meta ?? null,
      })
      return
    }

    const attempt = syncRetryCountRef.current + 1
    const delay = 250 * attempt
    syncRetryCountRef.current = attempt

    logAppEvent('auth.refresh_session.retry_scheduled', {
      orgId,
      attempt,
      delay,
      sessionOrgId: session.organization?.clerkOrganizationId ?? null,
    })

    const timeoutId = window.setTimeout(() => {
      void refreshSession()
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    isLoaded,
    isSignedIn,
    lastSessionSnapshot?.meta,
    orgId,
    refreshSession,
    session.organization?.clerkOrganizationId,
    sessionSyncState,
  ])

  const sessionOrgId = session.organization?.clerkOrganizationId ?? null
  const isWorkspaceReady =
    Boolean(isLoaded && isSignedIn)
    && sessionSyncState === 'ready'
    && (orgId ? sessionOrgId === orgId : sessionOrgId === null)
  const isOrganizationSyncing =
    Boolean(isLoaded && isSignedIn && orgId)
    && (sessionSyncState === 'loading' || sessionSyncState === 'partial' || sessionOrgId !== orgId)

  useEffect(() => {
    logAppEvent('auth.state', {
      isLoaded,
      isSignedIn,
      userId,
      routeReady: isWorkspaceReady,
      clerkOrgId: orgId ?? null,
      activeOrganization: clerkActiveOrganization,
      sessionOrgId,
      loading,
      sessionSyncState,
      isOrganizationSyncing,
      organizationSyncError,
      sessionMeta: session.meta ?? null,
    })
  }, [
    clerkActiveOrganization,
    isLoaded,
    isOrganizationSyncing,
    isSignedIn,
    isWorkspaceReady,
    loading,
    orgId,
    organizationSyncError,
    session.meta,
    sessionOrgId,
    sessionSyncState,
    userId,
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
      clerkActiveOrganization,
      isSignedIn: Boolean(isSignedIn),
      isOrganizationSyncing,
      isWorkspaceReady,
      sessionSyncState,
      organizationSyncError,
      lastSessionSnapshot,
      refreshSession,
      logout,
      inviteTeamMember,
      getRedirectLoopPreview,
      registerRedirectAttempt,
      clearRedirectLoop,
      redirectLoopState,
    }),
    [
      clearRedirectLoop,
      clerkActiveOrganization,
      getRedirectLoopPreview,
      inviteTeamMember,
      isLoaded,
      isOrganizationSyncing,
      isSignedIn,
      isWorkspaceReady,
      lastSessionSnapshot,
      loading,
      logout,
      orgId,
      organizationSyncError,
      redirectLoopState,
      refreshSession,
      registerRedirectAttempt,
      session,
      sessionSyncState,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
