const STORAGE_PREFIX = 'cpp'

export const STORAGE_KEYS = {
  users: `${STORAGE_PREFIX}:users:v1`,
  projects: `${STORAGE_PREFIX}:projects:v1`,
  invoices: `${STORAGE_PREFIX}:invoices:v1`,
  session: `${STORAGE_PREFIX}:session:v1`,
} as const

export interface SessionData {
  userId: string
  signedInAt: string
}

export const loadArray = <T>(key: string, fallback: T[]): T[] => {
  try {
    const raw = localStorage.getItem(key)

    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback))
      return fallback
    }

    const parsed = JSON.parse(raw) as T[]

    if (!Array.isArray(parsed)) {
      localStorage.setItem(key, JSON.stringify(fallback))
      return fallback
    }

    return parsed
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback))
    return fallback
  }
}

export const saveArray = <T>(key: string, value: T[]): void => {
  localStorage.setItem(key, JSON.stringify(value))
}

export const loadSession = (): SessionData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session)

    if (!raw) {
      return null
    }

    return JSON.parse(raw) as SessionData
  } catch {
    localStorage.removeItem(STORAGE_KEYS.session)
    return null
  }
}

export const saveSession = (session: SessionData): void => {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session))
}

export const clearSession = (): void => {
  localStorage.removeItem(STORAGE_KEYS.session)
}
