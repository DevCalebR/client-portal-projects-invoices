import { Link, NavLink, Outlet } from 'react-router-dom'
import { appConfig } from '../config/env'
import { useAuth } from '../context/AuthContext'
import { FeedbackViewport } from './FeedbackViewport'
import { formatDateTime } from '../utils/format'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'link link--active' : 'link'

const Header = () => {
  const { user, logout, sessionExpiresAt } = useAuth()

  return (
    <header className="site-header">
      <Link className="brand" to="/dashboard">
        {appConfig.appName}
      </Link>
      <p className="header-subtitle">{appConfig.appSubtitle}</p>
      <div className="spacer" />
      <div className="header-meta">
        <strong>{user?.name}</strong>
        <small>{sessionExpiresAt ? `Session ends ${formatDateTime(sessionExpiresAt)}` : 'Session active'}</small>
      </div>
      <span className="pill">{user?.role.toUpperCase()}</span>
      <button className="btn btn--ghost" onClick={logout} type="button">
        Logout
      </button>
    </header>
  )
}

export const AppLayout = () => {
  const { user } = useAuth()

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
          {user?.role === 'admin' && (
            <section className="admin-shortcuts">
              <h3>Admin shortcuts</h3>
              <Link className="btn btn--primary btn--sm" to="/projects/new">
                New project
              </Link>
              <Link className="btn btn--primary btn--sm" to="/invoices/new">
                New invoice
              </Link>
            </section>
          )}
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
