import Stripe from 'stripe'
import { serverEnv } from '../config/env.js'
import { AppError } from './http.js'

let stripeInstance: Stripe | null = null

export const getStripe = () => {
  if (!serverEnv.stripeSecretKey) {
    throw new AppError(500, 'Stripe is not configured for this environment.', 'STRIPE_NOT_CONFIGURED')
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(serverEnv.stripeSecretKey, {
      apiVersion: '2026-02-25.clover',
    })
  }

  return stripeInstance
}
