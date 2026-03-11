import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  PORT: z.coerce.number().int().positive().optional(),
  APP_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1).optional(),
  CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_SIGN_IN_URL: z.string().optional(),
  CLERK_SIGN_UP_URL: z.string().optional(),
  CLERK_AFTER_SIGN_IN_URL: z.string().optional(),
  CLERK_AFTER_SIGN_UP_URL: z.string().optional(),
  CLERK_INVITATION_REDIRECT_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_STARTER: z.string().min(1).optional(),
  STRIPE_PRICE_PROFESSIONAL: z.string().min(1).optional(),
  STRIPE_PRICE_AGENCY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  SENTRY_DSN: z.string().url().optional(),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_APP_URL: z.string().url().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('[env] Invalid environment configuration.', parsed.error.flatten())
}

const env = parsed.success ? parsed.data : {}

export const serverEnv = {
  nodeEnv: env.NODE_ENV ?? 'development',
  port: env.PORT ?? 8787,
  appUrl: env.APP_URL ?? env.VITE_APP_URL ?? 'http://localhost:5173',
  databaseUrl: env.DATABASE_URL ?? '',
  clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY ?? env.VITE_CLERK_PUBLISHABLE_KEY ?? '',
  clerkSecretKey: env.CLERK_SECRET_KEY ?? '',
  clerkSignInUrl: env.CLERK_SIGN_IN_URL ?? '/sign-in',
  clerkSignUpUrl: env.CLERK_SIGN_UP_URL ?? '/sign-up',
  clerkAfterSignInUrl: env.CLERK_AFTER_SIGN_IN_URL ?? '/dashboard',
  clerkAfterSignUpUrl: env.CLERK_AFTER_SIGN_UP_URL ?? '/onboarding',
  clerkInvitationRedirectUrl:
    env.CLERK_INVITATION_REDIRECT_URL ?? `${env.APP_URL ?? env.VITE_APP_URL ?? 'http://localhost:5173'}/sign-in`,
  stripeSecretKey: env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET ?? '',
  stripePriceIds: {
    STARTER: env.STRIPE_PRICE_STARTER ?? '',
    PROFESSIONAL: env.STRIPE_PRICE_PROFESSIONAL ?? '',
    AGENCY: env.STRIPE_PRICE_AGENCY ?? '',
  },
  resendApiKey: env.RESEND_API_KEY ?? '',
  resendFromEmail: env.RESEND_FROM_EMAIL ?? 'Client Portal <no-reply@example.com>',
  sentryDsn: env.SENTRY_DSN ?? env.VITE_SENTRY_DSN ?? '',
}

export const hasServerIntegrationKey = (
  key: 'stripeSecretKey' | 'stripeWebhookSecret' | 'resendApiKey' | 'clerkSecretKey' | 'databaseUrl',
) => Boolean(serverEnv[key])

