import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { BILLING_PLAN_LABELS, isInternalRole } from '../types/entities'
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
  const { user, membership, organization } = useAuth()
  const { projects, invoices, activities, notifications, isLoading } = useData()

  if (!user || !membership || !organization) {
    return null
  }

  const isInternal = isInternalRole(membership.role)
  const activeProjects = projects.filter((project) => project.status !== 'COMPLETED').length
  const openInvoices = invoices.filter((invoice) =>
    ['OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status),
  )
  const outstandingBalance = openInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0)
  const unreadNotifications = notifications.filter((notification) => !notification.readAt).length

  if (isLoading) {
    return <p className="loading-placeholder">Loading workspace data...</p>
  }

  return (
    <div className="page-stack">
      <header className="page-head">
        <div>
          <h1>Welcome back, {user.fullName}</h1>
          <p>
            {isInternal
              ? 'Internal workspace view across all organization projects, invoices, and notifications.'
              : 'Client workspace view scoped to your projects, invoices, and payment activity.'}
          </p>
        </div>
      </header>

      <section className="stats-grid">
        <DashboardCard
          label="Plan"
          value={BILLING_PLAN_LABELS[organization.plan]}
          hint={`Subscription status: ${organization.subscriptionStatus.toLowerCase().replaceAll('_', ' ')}`}
        />
        <DashboardCard
          label="Projects"
          value={String(projects.length)}
          hint={`${activeProjects} currently active`}
        />
        <DashboardCard
          label="Open invoices"
          value={String(openInvoices.length)}
          hint="Invoices awaiting payment or follow-up"
        />
        <DashboardCard
          label="Outstanding balance"
          value={formatCurrency(outstandingBalance)}
          hint="Current unpaid balance"
        />
        <DashboardCard
          label="Unread notifications"
          value={String(unreadNotifications)}
          hint="Persistent inbox items for this workspace"
        />
      </section>

      <section className="card">
        <div className="panel-head">
          <div>
            <h2>Quick actions</h2>
            <p className="muted">
              {isInternal
                ? 'Create new work, send invoices, and manage billing or team access.'
                : 'Review project progress, invoices, and recent updates.'}
            </p>
          </div>
        </div>
        <div className="quick-action-grid">
          <Link className="action-card" to="/projects">
            <strong>Browse projects</strong>
            <span>Track active delivery work and deadlines.</span>
          </Link>
          <Link className="action-card" to="/invoices">
            <strong>Open invoices</strong>
            <span>Review invoice status and payment progress.</span>
          </Link>
          {isInternal ? (
            <>
              <Link className="action-card" to="/projects/new">
                <strong>Create project</strong>
                <span>Start a new project for a client in this organization.</span>
              </Link>
              <Link className="action-card" to="/settings">
                <strong>Billing and team</strong>
                <span>Manage subscriptions, invites, and workspace settings.</span>
              </Link>
            </>
          ) : (
            <Link className="action-card" to="/settings">
              <strong>Notification center</strong>
              <span>Review unread updates and account access details.</span>
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
          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              message={
                isInternal
                  ? 'Create your first client project to start tracking delivery.'
                  : 'No projects are currently assigned to your account.'
              }
            />
          ) : (
            <ul className="list">
              {projects.slice(0, 5).map((project) => (
                <li key={project.id} className="list-item">
                  <div>
                    <Link to={`/projects/${project.id}`} className="link-strong">
                      {project.name}
                    </Link>
                    <small>
                      Client: {project.client.name} • Due {formatDate(project.dueDate ?? undefined)}
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
          {invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              message="Invoice activity will appear here once invoices are issued."
            />
          ) : (
            <ul className="list">
              {invoices.slice(0, 5).map((invoice) => (
                <li key={invoice.id} className="list-item list-item--spread">
                  <div>
                    <Link to={`/invoices/${invoice.id}`} className="link-strong">
                      Invoice #{invoice.invoiceNumber}
                    </Link>
                    <small>
                      {invoice.client.name} • Total {formatCurrency(invoice.total)}
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
          {activities.length === 0 ? (
            <EmptyState
              title="No activity yet"
              message="Project, billing, and invoice activity will appear here as the workspace evolves."
            />
          ) : (
            <ul className="list">
              {activities.slice(0, 5).map((activity) => (
                <li key={activity.id} className="list-item">
                  <div>
                    <strong>{activity.message}</strong>
                    <small>{activity.actor?.fullName ?? 'System'}</small>
                  </div>
                  <small className="muted">{formatDateTime(activity.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
