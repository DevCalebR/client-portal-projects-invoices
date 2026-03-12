import { OrganizationSwitcher, UserButton } from '@clerk/react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { appConfig } from '../config/env'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { BILLING_PLAN_LABELS, isInternalRole } from '../types/entities'
import { FeedbackViewport } from './FeedbackViewport'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'link link--active' : 'link'

const Header = () => {
  const { user, membership, organization } = useAuth()
  const { notifications } = useData()
  const unreadCount = notifications.filter((notification) => !notification.readAt).length

  return (
    <header className="site-header">
      <div className="header-brand">
        <Link className="brand" to="/dashboard">
          {appConfig.appName}
        </Link>
        <p className="header-subtitle">{appConfig.appSubtitle}</p>
      </div>
      <div className="spacer" />
      <div className="header-meta">
        <strong>{organization?.name ?? user?.fullName}</strong>
        <small>
          {organization
            ? `${BILLING_PLAN_LABELS[organization.plan]} plan • ${unreadCount} unread notification(s)`
            : 'No organization selected'}
        </small>
      </div>
      <span className="pill">{membership?.role ?? 'USER'}</span>
      <OrganizationSwitcher
        hidePersonal
        afterSelectOrganizationUrl="/onboarding"
        afterCreateOrganizationUrl="/onboarding"
      />
      <UserButton />
    </header>
  )
}

export const AppLayout = () => {
  const { membership } = useAuth()
  const isInternal = isInternalRole(membership?.role)

  return (
    <div className="shell">
      <Header />
      <FeedbackViewport />
      <div className="layout-grid">
        <aside className="sidebar card">
          <h2 className="nav-title">Navigation</h2>
          <nav className="nav">
            <NavLink className={navLinkClass} to="/dashboard">
              Dashboard
            </NavLink>
            <NavLink className={navLinkClass} to="/projects">
              Projects
            </NavLink>
            <NavLink className={navLinkClass} to="/invoices">
              Invoices
            </NavLink>
            <NavLink className={navLinkClass} to="/settings">
              Settings
            </NavLink>
          </nav>
          {isInternal ? (
            <section className="admin-shortcuts">
              <h3>Workspace actions</h3>
              <Link className="btn btn--primary btn--sm" to="/projects/new">
                New project
              </Link>
              <Link className="btn btn--primary btn--sm" to="/invoices/new">
                New invoice
              </Link>
            </section>
          ) : null}
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
