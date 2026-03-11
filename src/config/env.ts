import { z } from 'zod'

const rawEnvSchema = z.object({
  VITE_APP_NAME: z.string().trim().min(1).optional(),
  VITE_APP_SUBTITLE: z.string().trim().min(1).optional(),
  VITE_SUPPORT_EMAIL: z.string().trim().email().optional(),
  VITE_ENABLE_DEMO_MODE: z.enum(['true', 'false']).optional(),
  VITE_SESSION_TIMEOUT_MINUTES: z.coerce.number().int().min(15).max(1440).optional(),
})

const parsedEnv = rawEnvSchema.safeParse(import.meta.env)

if (!parsedEnv.success) {
  console.error('[env] Invalid environment configuration detected.', parsedEnv.error.flatten())
}

const rawEnv = parsedEnv.success ? parsedEnv.data : {}

export const appConfig = {
  appName: rawEnv.VITE_APP_NAME ?? 'Client Portal',
  appSubtitle: rawEnv.VITE_APP_SUBTITLE ?? 'Projects & Invoices',
  supportEmail: rawEnv.VITE_SUPPORT_EMAIL ?? 'support@example.com',
  enableDemoMode: rawEnv.VITE_ENABLE_DEMO_MODE !== 'false',
  sessionTimeoutMinutes: rawEnv.VITE_SESSION_TIMEOUT_MINUTES ?? 480,
}

