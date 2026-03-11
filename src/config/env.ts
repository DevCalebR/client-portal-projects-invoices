import { z } from 'zod'

const rawEnvSchema = z.object({
  VITE_APP_NAME: z.string().trim().min(1).optional(),
  VITE_APP_SUBTITLE: z.string().trim().min(1).optional(),
  VITE_APP_URL: z.string().url().optional(),
  VITE_API_BASE_URL: z.string().url().optional(),
  VITE_SUPPORT_EMAIL: z.string().trim().email().optional(),
  VITE_CLERK_PUBLISHABLE_KEY: z.string().trim().min(1).optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
})

const parsedEnv = rawEnvSchema.safeParse(import.meta.env)

if (!parsedEnv.success) {
  console.error('[env] Invalid environment configuration detected.', parsedEnv.error.flatten())
}

const rawEnv = parsedEnv.success ? parsedEnv.data : {}

export const appConfig = {
  appName: rawEnv.VITE_APP_NAME ?? 'Client Portal',
  appSubtitle: rawEnv.VITE_APP_SUBTITLE ?? 'Projects & Invoices',
  appUrl: rawEnv.VITE_APP_URL ?? window.location.origin,
  apiBaseUrl: rawEnv.VITE_API_BASE_URL ?? '',
  supportEmail: rawEnv.VITE_SUPPORT_EMAIL ?? 'support@example.com',
  clerkPublishableKey: rawEnv.VITE_CLERK_PUBLISHABLE_KEY ?? '',
  sentryDsn: rawEnv.VITE_SENTRY_DSN ?? '',
}
