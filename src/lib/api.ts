import { appConfig } from '../config/env'

export class ApiError extends Error {
  statusCode: number
  code: string
  details?: unknown

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

const createUrl = (path: string) => {
  if (path.startsWith('http')) {
    return path
  }

  if (!appConfig.apiBaseUrl) {
    return path
  }

  return `${appConfig.apiBaseUrl}${path}`
}

export const apiFetch = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(createUrl(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error ?? 'API_ERROR',
      payload?.message ?? 'Request failed.',
      payload?.details,
    )
  }

  return payload as T
}
