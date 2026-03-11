import * as Sentry from '@sentry/node'
import { serverEnv } from '../config/env'

let initialized = false

export const initServerSentry = () => {
  if (initialized || !serverEnv.sentryDsn) {
    return
  }

  Sentry.init({
    dsn: serverEnv.sentryDsn,
    tracesSampleRate: 0.1,
  })

  initialized = true
}

export const captureServerException = (error: unknown, context?: Record<string, unknown>) => {
  if (serverEnv.sentryDsn) {
    Sentry.captureException(error, { extra: context })
  }
}

