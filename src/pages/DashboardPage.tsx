import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { StatusBadge } from '../components/StatusBadge'
import { formatCurrency, formatDate } from '../utils/format'
import { isAdminUser } from '../types/entities'

const DashboardCard = ({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) => (
  <article className="stat-card">
    <p>{label}</p>
    <h3>{value}</h3>
    <small>{hint}</small>
  </article>
)

export const DashboardPage = () => {
  const { user, users } = useAuth()
  const { projects, invoices, isLoading } = useData()

  if (!user) {
    return null
  }

  const isAdmin = isAdminUser(user)
  const visibleProjects = isAdmin
    ? projects
    : projects.filter((project) => project.clientId === user.id)
  const visibleInvoices = isAdmin
    ? invoices
    : invoices.filter((invoice) => invoice.clientId === user.id)

  const activeProjects = visibleProjects.filter((project) => project.status !== 'completed').length
  const unpaidCount = visibleInvoices.filter((invoice) => invoice.status === 'unpaid').length
  const paidCount = visibleInvoices.filter((invoice) => invoice.status === 'paid').length
  const overdueCount = visibleInvoices.filter((invoice) => invoice.status === 'overdue').length
  const getClientName = (clientId: string) =>
    users.find((person) => person.id === clientId)?.name ?? 'Unassigned client'

  if (isLoading) {
    return <p className="loading-placeholder">Loading dashboard data...</p>
  }

  return (
    <div className="page-stack">
      <header className="page-head">
        <h1>Welcome back, {user.name}</h1>
        <p>
          {isAdmin
            ? 'Admin view of all projects and invoices in the client portal.'
            : 'Your assigned projects and invoices, with instant visibility.'}
        </p>
      </header>

      <section className="stats-grid">
        <DashboardCard
          label="Total Projects"
          value={String(visibleProjects.length)}
          hint="Active + completed"
        />
        <DashboardCard
          label="Active Work"
          value={String(activeProjects)}
          hint="In planning, progress, and review"
        />
        <DashboardCard
          label="Paid Invoices"
          value={String(paidCount)}
          hint="Marked as paid"
        />
        <DashboardCard
          label="Unpaid Invoices"
          value={String(unpaidCount)}
          hint={isAdmin ? 'Waiting for client payment' : 'Your outstanding items'}
        />
        <DashboardCard
          label="Overdue Invoices"
          value={String(overdueCount)}
          hint="Requires follow-up"
        />
      </section>

      <div className="split-grid">
        <section className="card">
          <div className="panel-head">
            <h2>Recent projects</h2>
            <Link to="/projects" className="link-inline">
              Go to projects
            </Link>
          </div>
          {visibleProjects.length === 0 ? (
            <p className="muted">No projects are currently assigned to this account.</p>
          ) : (
            <ul className="list">
              {visibleProjects.slice(0, 5).map((project) => (
                <li key={project.id} className="list-item">
                  <div>
                    <strong>{project.name}</strong>
                    <small>
                      Client: {getClientName(project.clientId)} • Due {formatDate(project.dueDate)}
                    </small>
                  </div>
                  <StatusBadge type="project" status={project.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="panel-head">
            <h2>Recent invoices</h2>
            <Link to="/invoices" className="link-inline">
              Go to invoices
            </Link>
          </div>
          {visibleInvoices.length === 0 ? (
            <p className="muted">No invoices are currently available.</p>
          ) : (
            <ul className="list">
              {visibleInvoices.slice(0, 5).map((invoice) => (
                <li key={invoice.id} className="list-item list-item--spread">
                  <div>
                    <strong>{invoice.id}</strong>
                    <small>
                      Client: {getClientName(invoice.clientId)} • Total {formatCurrency(invoice.total)}
                    </small>
                  </div>
                  <StatusBadge type="invoice" status={invoice.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
