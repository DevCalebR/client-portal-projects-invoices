import { SignIn } from '@clerk/react'
import { appConfig } from '../config/env'

export const LoginPage = () => (
  <main className="login-shell">
    <section className="auth-shell">
      <div className="auth-copy-block">
        <p className="eyebrow">{appConfig.appName}</p>
        <h1>Sign in to your organization workspace</h1>
        <p className="auth-copy">
          Authenticate with Clerk, select an organization, and continue into the production-backed client portal.
        </p>
      </div>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/onboarding"
      />
    </section>
  </main>
)
