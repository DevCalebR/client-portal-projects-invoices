type LogMeta = Record<string, unknown>

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown error',
  }
}

export const logAppError = (error: unknown, meta: LogMeta = {}) => {
  console.error('[app:error]', {
    ...meta,
    error: normalizeError(error),
    timestamp: new Date().toISOString(),
  })
}

export const logAppEvent = (event: string, meta: LogMeta = {}) => {
  if (import.meta.env.PROD) {
    return
  }

  console.info('[app:event]', {
    event,
    ...meta,
    timestamp: new Date().toISOString(),
  })
}

