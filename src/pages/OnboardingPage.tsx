import { CreateOrganization, OrganizationSwitcher } from '@clerk/react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const OnboardingPage = () => {
  const { organization } = useAuth()

  if (organization) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="login-shell">
      <section className="auth-shell">
        <div className="auth-copy-block">
          <p className="eyebrow">Workspace onboarding</p>
          <h1>Create or select an organization</h1>
          <p className="auth-copy">
            Every project, invoice, member, and payment is scoped to a Clerk organization. Create one to continue.
          </p>
          <div className="inline-actions">
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl="/dashboard"
              afterCreateOrganizationUrl="/dashboard"
            />
          </div>
        </div>
        <CreateOrganization
          routing="path"
          path="/onboarding"
          skipInvitationScreen={false}
          afterCreateOrganizationUrl="/dashboard"
        />
      </section>
    </main>
  )
}
