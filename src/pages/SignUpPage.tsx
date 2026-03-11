import { SignUp } from '@clerk/react'
import { appConfig } from '../config/env'

export const SignUpPage = () => (
  <main className="login-shell">
    <section className="auth-shell">
      <div className="auth-copy-block">
        <p className="eyebrow">{appConfig.appName}</p>
        <h1>Create your workspace account</h1>
        <p className="auth-copy">
          Sign up with Clerk, then create or join an organization to activate the multi-tenant workspace.
        </p>
      </div>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/onboarding"
      />
    </section>
  </main>
)
