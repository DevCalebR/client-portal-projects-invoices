import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/react'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { appConfig } from './config/env'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { FeedbackProvider } from './context/FeedbackContext'

if (appConfig.sentryDsn) {
  Sentry.init({
    dsn: appConfig.sentryDsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  })
}

const root = createRoot(document.getElementById('root')!)

if (!appConfig.clerkPublishableKey) {
  root.render(
    <StrictMode>
      <main className="login-shell">
        <section className="card auth-card">
          <p className="eyebrow">Configuration required</p>
          <h1>Clerk publishable key missing</h1>
          <p className="auth-copy">
            Set `VITE_CLERK_PUBLISHABLE_KEY` before running the SaaS client locally.
          </p>
        </section>
      </main>
    </StrictMode>,
  )
} else {
  root.render(
    <StrictMode>
      <ClerkProvider
        publishableKey={appConfig.clerkPublishableKey}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        afterSignOutUrl="/sign-in"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/onboarding"
      >
        <AppErrorBoundary>
          <AuthProvider>
            <FeedbackProvider>
              <DataProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </DataProvider>
            </FeedbackProvider>
          </AuthProvider>
        </AppErrorBoundary>
      </ClerkProvider>
    </StrictMode>,
  )
}
