import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'link link--active' : 'link'

const Header = () => {
  const { user, logout } = useAuth()

  return (
    <header className="site-header">
      <Link className="brand" to="/dashboard">
        Client Portal
      </Link>
      <p className="header-subtitle">Projects &amp; Invoices</p>
      <div className="spacer" />
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
