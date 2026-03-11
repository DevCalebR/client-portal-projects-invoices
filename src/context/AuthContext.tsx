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
import { appConfig } from '../config/env'
import { storedUserSchema, sessionSchema } from '../data/schemas'
import { getSeedData } from '../data/seed'
import {
  clearSession,
  loadSession,
  loadArray,
  saveArray,
  saveSession,
  STORAGE_KEYS,
} from '../data/storage'
import type { LegacyUser, PublicUser, StoredUser, User } from '../types/entities'
import { logAppError, logAppEvent } from '../utils/logger'
import { hashSecret } from '../utils/security'

interface LoginInput {
  email: string
  password: string
}

interface LoginResult {
  ok: boolean
  message?: string
}

interface AuthContextType {
  user: PublicUser | null
  users: PublicUser[]
  loading: boolean
  sessionExpiresAt: string | null
  login: (input: LoginInput) => Promise<LoginResult>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

const toPublic = (entry: User): PublicUser => ({
  id: entry.id,
  name: entry.name,
  email: entry.email,
  role: entry.role,
  company: entry.company,
})

const SESSION_TIMEOUT_MS = appConfig.sessionTimeoutMinutes * 60 * 1000

const isLegacyUser = (entry: StoredUser): entry is LegacyUser => 'password' in entry

const normalizeStoredUser = async (entry: StoredUser): Promise<User> => {
  if (!isLegacyUser(entry)) {
    return entry
  }

  return {
    id: entry.id,
    name: entry.name,
    email: entry.email,
    role: entry.role,
    company: entry.company,
    passwordHash: await hashSecret(entry.password),
  }
}

const getSessionExpiry = (signedInAt: string): string | null => {
  const signedInAtMs = Date.parse(signedInAt)

  if (Number.isNaN(signedInAtMs)) {
    return null
  }

  return new Date(signedInAtMs + SESSION_TIMEOUT_MS).toISOString()
}

const isSessionExpired = (signedInAt: string): boolean => {
  const expiresAt = getSessionExpiry(signedInAt)

  if (!expiresAt) {
    return true
  }

  return Date.parse(expiresAt) <= Date.now()
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [user, setUser] = useState<PublicUser | null>(null)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null)

  const hydrateUsers = useCallback(async (): Promise<User[]> => {
    const seed = getSeedData()
    const storedUsers = loadArray<StoredUser>(STORAGE_KEYS.users, seed.users, storedUserSchema)
    const normalizedUsers = await Promise.all(storedUsers.map(normalizeStoredUser))

    if (!saveArray(STORAGE_KEYS.users, normalizedUsers)) {
      logAppError(new Error('Failed to persist normalized user records.'), {
        scope: 'AuthProvider',
        storageKey: STORAGE_KEYS.users,
      })
    }

    return normalizedUsers
  }, [])

  const hydrateSession = useCallback((availableUsers: User[]) => {
    const activeSession = loadSession(sessionSchema)

    if (!activeSession) {
      setUser(null)
      setSessionExpiresAt(null)
      return
    }

    if (isSessionExpired(activeSession.signedInAt)) {
      clearSession()
      setUser(null)
      setSessionExpiresAt(null)
      logAppEvent('session_expired')
      return
    }

    const nextUser = availableUsers.map(toPublic).find((entry) => entry.id === activeSession.userId)

    if (!nextUser) {
      clearSession()
      setUser(null)
      setSessionExpiresAt(null)
      return
    }

    setUser(nextUser)
    setSessionExpiresAt(getSessionExpiry(activeSession.signedInAt))
  }, [])

  const syncFromStorage = useCallback(async () => {
    const nextUsers = await hydrateUsers()
    setUsers(nextUsers)
    hydrateSession(nextUsers)
  }, [hydrateSession, hydrateUsers])

  useEffect(() => {
    const boot = async () => {
      try {
        await syncFromStorage()
      } catch (error) {
        logAppError(error, { scope: 'AuthProvider.boot' })
      } finally {
        setLoading(false)
      }
    }

    const timer = window.setTimeout(() => {
      void boot()
    }, 160)

    return () => window.clearTimeout(timer)
  }, [syncFromStorage])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== STORAGE_KEYS.users && event.key !== STORAGE_KEYS.session) {
        return
      }

      void syncFromStorage()
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [syncFromStorage])

  useEffect(() => {
    if (!sessionExpiresAt) {
      return
    }

    const delay = Date.parse(sessionExpiresAt) - Date.now()

    if (delay <= 0) {
      clearSession()
      setUser(null)
      setSessionExpiresAt(null)
      return
    }

    const timer = window.setTimeout(() => {
      clearSession()
      setUser(null)
      setSessionExpiresAt(null)
      logAppEvent('session_expired')
    }, delay)

    return () => window.clearTimeout(timer)
  }, [sessionExpiresAt])

  const login = useCallback(async ({ email, password }: LoginInput): Promise<LoginResult> => {
    const normalizedEmail = email.trim().toLowerCase()
    const account = users.find((entry) => entry.email.toLowerCase() === normalizedEmail)
    const passwordHash = await hashSecret(password)

    if (!account || account.passwordHash !== passwordHash) {
      return { ok: false, message: 'Invalid email or password.' }
    }

    const publicUser = toPublic(account)
    const signedInAt = new Date().toISOString()
    setUser(publicUser)
    setSessionExpiresAt(getSessionExpiry(signedInAt))

    const didSaveSession = saveSession({ userId: publicUser.id, signedInAt })

    if (!didSaveSession) {
      setUser(null)
      setSessionExpiresAt(null)
      logAppError(new Error('Failed to persist session.'), {
        scope: 'AuthProvider.login',
      })
      return { ok: false, message: 'Unable to persist your session. Please retry.' }
    }

    logAppEvent('login', { userId: publicUser.id, role: publicUser.role })

    return { ok: true }
  }, [users])

  const logout = useCallback(() => {
    logAppEvent('logout', { userId: user?.id ?? 'anonymous' })
    setUser(null)
    setSessionExpiresAt(null)
    clearSession()
  }, [user?.id])

  const contextValue = useMemo(
    () => ({
      user,
      users: users.map(toPublic),
      loading,
      sessionExpiresAt,
      login,
      logout,
    }),
    [user, users, loading, sessionExpiresAt, login, logout],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
