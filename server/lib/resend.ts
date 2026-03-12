import { Resend } from 'resend'
import { serverEnv } from '../config/env.js'
import { AppError } from './http.js'

let resendInstance: Resend | null = null

export const getResend = () => {
  if (!serverEnv.resendApiKey) {
    throw new AppError(500, 'Resend is not configured for this environment.', 'RESEND_NOT_CONFIGURED')
  }

  if (!resendInstance) {
    resendInstance = new Resend(serverEnv.resendApiKey)
  }

  return resendInstance
}
