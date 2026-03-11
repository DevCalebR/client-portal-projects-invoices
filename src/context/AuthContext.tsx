/* eslint-disable react-refresh/only-export-components */
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth as useClerkAuth } from '@clerk/react'
import { apiFetch } from '../lib/api'
import type { AppSession, OrganizationRole, TeamInviteInput } from '../types/entities'
import { logAppError } from '../utils/logger'

interface AuthContextType extends AppSession {
  loading: boolean
  isSignedIn: boolean
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

  const refreshSession = useCallback(async () => {
    if (!isLoaded) {
      return
    }

    if (!isSignedIn || !userId) {
      setSession(emptySession)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const nextSession = await apiFetch<AppSession>('/api/auth/session')
      setSession(nextSession)
    } catch (error) {
      logAppError(error, {
        scope: 'AuthProvider.refreshSession',
      })
      setSession(emptySession)
    } finally {
      setLoading(false)
    }
  }, [isLoaded, isSignedIn, userId])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession, orgId])

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
      isSignedIn: Boolean(isSignedIn),
      refreshSession,
      logout,
      inviteTeamMember,
    }),
    [session, loading, isSignedIn, refreshSession, logout, inviteTeamMember],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
