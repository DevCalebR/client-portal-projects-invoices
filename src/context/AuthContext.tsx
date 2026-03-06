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
import { getSeedData } from '../data/seed'
import { clearSession, loadSession, loadArray, saveSession, STORAGE_KEYS } from '../data/storage'
import type { PublicUser, User } from '../types/entities'

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [user, setUser] = useState<PublicUser | null>(null)

  useEffect(() => {
    const boot = () => {
      const seed = getSeedData()
      const persistedUsers = loadArray<User>(STORAGE_KEYS.users, seed.users)
      setUsers(persistedUsers)

      const activeSession = loadSession()
      if (activeSession) {
        const publicUsers = persistedUsers.map(toPublic)
        const sessionUser = publicUsers.find((entry) => entry.id === activeSession.userId)
        setUser(sessionUser ?? null)
      }

      setLoading(false)
    }

    const timer = window.setTimeout(boot, 160)
    return () => window.clearTimeout(timer)
  }, [])

  const login = useCallback(async ({ email, password }: LoginInput): Promise<LoginResult> => {
    const normalizedEmail = email.trim().toLowerCase()
    const account = users.find((entry) => entry.email.toLowerCase() === normalizedEmail)

    if (!account || account.password !== password) {
      return { ok: false, message: 'Invalid email or password.' }
    }

    const publicUser = toPublic(account)
    setUser(publicUser)
    saveSession({ userId: publicUser.id, signedInAt: new Date().toISOString() })

    return { ok: true }
  }, [users])

  const logout = useCallback(() => {
    setUser(null)
    clearSession()
  }, [])

  const contextValue = useMemo(
    () => ({
      user,
      users: users.map(toPublic),
      loading,
      login,
      logout,
    }),
    [user, users, loading, login, logout],
  )

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
