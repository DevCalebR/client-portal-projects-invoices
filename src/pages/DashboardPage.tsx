import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { isAdminUser } from '../types/entities'
import { formatCurrency, formatDate, formatDateTime } from '../utils/format'

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
  const { projects, invoices, activities, isLoading } = useData()

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
  const visibleProjectIds = new Set(visibleProjects.map((project) => project.id))
  const visibleInvoiceIds = new Set(visibleInvoices.map((invoice) => invoice.id))
  const visibleActivities = activities.filter((activity) => {
    if (isAdmin) {
      return true
    }

    if (activity.subjectType === 'project') {
      return visibleProjectIds.has(activity.subjectId)
    }

    if (activity.subjectType === 'invoice') {
      return visibleInvoiceIds.has(activity.subjectId)
    }

    return activity.actorId === user.id
  })

  const activeProjects = visibleProjects.filter((project) => project.status !== 'completed').length
  const unpaidCount = visibleInvoices.filter((invoice) => invoice.status === 'unpaid').length
  const paidCount = visibleInvoices.filter((invoice) => invoice.status === 'paid').length
  const overdueCount = visibleInvoices.filter((invoice) => invoice.status === 'overdue').length
  const outstandingBalance = visibleInvoices
    .filter((invoice) => invoice.status !== 'paid')
    .reduce((sum, invoice) => sum + invoice.total, 0)
  const getClientName = (clientId: string) =>
    users.find((person) => person.id === clientId)?.name ?? 'Unassigned client'

  if (isLoading) {
    return <p className="loading-placeholder">Loading dashboard data...</p>
  }

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <h1>Welcome back, {user.name}</h1>
          <p>
            {isAdmin
              ? 'Admin view of all projects and invoices in the client portal.'
              : 'Your assigned projects and invoices, with instant visibility.'}
          </p>
        </div>
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
        <DashboardCard
          label="Outstanding Balance"
          value={formatCurrency(outstandingBalance)}
          hint={isAdmin ? 'Open invoice value across the portal' : 'Amount still pending'}
        />
      </section>

      <section className="card">
        <div className="panel-head">
          <div>
            <h2>Quick actions</h2>
            <p className="muted">
              {isAdmin
                ? 'Jump directly into the most common admin workflows.'
                : 'Open the areas that need attention first.'}
            </p>
          </div>
        </div>
        <div className="quick-action-grid">
          <Link className="action-card" to="/projects">
            <strong>Browse projects</strong>
            <span>Review project status, deadlines, and scope.</span>
          </Link>
          <Link className="action-card" to="/invoices">
            <strong>Open invoices</strong>
            <span>Track payment status and outstanding balances.</span>
          </Link>
          {isAdmin ? (
            <>
              <Link className="action-card" to="/projects/new">
                <strong>Create project</strong>
                <span>Start a new client delivery workflow.</span>
              </Link>
              <Link className="action-card" to="/invoices/new">
                <strong>Create invoice</strong>
                <span>Generate a new invoice from an active project.</span>
              </Link>
            </>
          ) : (
            <Link className="action-card" to="/settings">
              <strong>Review account settings</strong>
              <span>Check access scope and session details.</span>
            </Link>
          )}
        </div>
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
                    <Link to={`/projects/${project.id}`} className="link-strong">
                      {project.name}
                    </Link>
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
                    <Link to={`/invoices/${invoice.id}`} className="link-strong">
                      {invoice.id}
                    </Link>
                    <small>
                      Client: {getClientName(invoice.clientId)} • Total{' '}
                      {formatCurrency(invoice.total)}
                    </small>
                  </div>
                  <StatusBadge type="invoice" status={invoice.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="panel-head">
            <h2>Recent activity</h2>
            <Link to="/settings" className="link-inline">
              Open settings
            </Link>
          </div>
          {visibleActivities.length === 0 ? (
            <EmptyState
              title="No activity yet"
              message="Project and invoice changes will appear here once work starts moving."
            />
          ) : (
            <ul className="list">
              {visibleActivities.slice(0, 5).map((activity) => (
                <li key={activity.id} className="list-item">
                  <div>
                    <strong>{activity.subjectName}</strong>
                    <small>
                      {activity.actorName} • {activity.description}
                    </small>
                  </div>
                  <small className="muted">{formatDateTime(activity.timestamp)}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
