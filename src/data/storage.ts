import { z, type ZodType } from 'zod'

const STORAGE_PREFIX = 'cpp'

export const STORAGE_KEYS = {
  users: `${STORAGE_PREFIX}:users:v1`,
  projects: `${STORAGE_PREFIX}:projects:v1`,
  invoices: `${STORAGE_PREFIX}:invoices:v1`,
  activity: `${STORAGE_PREFIX}:activity:v1`,
  session: `${STORAGE_PREFIX}:session:v1`,
} as const

export interface SessionData {
  userId: string
  signedInAt: string
}

export const loadArray = <T>(key: string, fallback: T[], schema?: ZodType<T>): T[] => {
  try {
    const raw = localStorage.getItem(key)

    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback))
      return fallback
    }

    const parsed = JSON.parse(raw) as unknown

    if (!Array.isArray(parsed)) {
      localStorage.setItem(key, JSON.stringify(fallback))
      return fallback
    }

    if (!schema) {
      return parsed as T[]
    }

    const result = z.array(schema).safeParse(parsed)

    if (!result.success) {
      localStorage.setItem(key, JSON.stringify(fallback))
      return fallback
    }

    return result.data
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback))
    return fallback
  }
}

export const saveArray = <T>(key: string, value: T[]): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const loadSession = <T = SessionData>(schema?: ZodType<T>): T | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.session)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown

    if (!schema) {
      return parsed as T
    }

    const result = schema.safeParse(parsed)

    if (!result.success) {
      localStorage.removeItem(STORAGE_KEYS.session)
      return null
    }

    return result.data
  } catch {
    localStorage.removeItem(STORAGE_KEYS.session)
    return null
  }
}

export const saveSession = (session: SessionData): boolean => {
  try {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session))
    return true
  } catch {
    return false
  }
}

export const clearSession = (): void => {
  localStorage.removeItem(STORAGE_KEYS.session)
}
