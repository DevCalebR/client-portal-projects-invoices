import { Link } from 'react-router-dom'
import { appConfig } from '../config/env'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/FeedbackContext'
import { isAdminUser } from '../types/entities'
import { formatDateTime } from '../utils/format'
import { logAppError } from '../utils/logger'

export const SettingsPage = () => {
  const { user, sessionExpiresAt } = useAuth()
  const { resetDemoData, activities } = useData()
  const { notify } = useFeedback()

  if (!user) {
    return null
  }

  const isAdmin = isAdminUser(user)

  const handleReset = () => {
    if (!isAdmin) {
      return
    }

    const shouldReset = window.confirm(
      'This will replace current projects/invoices with seed data and reset activity history. Continue?',
    )

    if (shouldReset) {
      try {
        resetDemoData()
        notify({
          title: 'Demo data restored',
          message: 'Projects, invoices, and activity history were reset.',
          tone: 'success',
        })
      } catch (error) {
        logAppError(error, { scope: 'SettingsPage.resetDemoData' })
        notify({
          title: 'Unable to restore demo data',
          message: error instanceof Error ? error.message : 'Please try again.',
          tone: 'error',
        })
      }
    }
  }

  return (
    <div className="page-stack">
      <section className="card">
        <h1>Settings</h1>
        <p className="muted">
          Session and entities are local-only and persist in this browser&apos;s localStorage.
        </p>

        <div className="settings-grid">
          <div>
            <p className="muted">Signed in as</p>
            <p>{user.name}</p>
          </div>
          <div>
            <p className="muted">Email</p>
            <p>{user.email}</p>
          </div>
          <div>
            <p className="muted">Role</p>
            <p>{user.role}</p>
          </div>
          <div>
            <p className="muted">Company</p>
            <p>{user.company || 'N/A'}</p>
          </div>
          <div>
            <p className="muted">Session expires</p>
            <p>{formatDateTime(sessionExpiresAt)}</p>
          </div>
          <div>
            <p className="muted">Support email</p>
            <p>{appConfig.supportEmail}</p>
          </div>
        </div>
      </section>

      {isAdmin ? (
        <section className="card">
          <h2>Storage behavior</h2>
          <p>
            Data is stored with stable localStorage keys and seeded demo content is only written if local keys
            are missing. Use this for realistic portfolio demos without a backend.
          </p>
          <button className="btn btn--primary" onClick={handleReset} type="button">
            Restore seeded demo data
          </button>
        </section>
      ) : (
        <section className="card">
          <h2>Access level</h2>
          <p>
            Client accounts can review only their assigned projects and invoices. Changes to demo data are
            limited to admin accounts.
          </p>
        </section>
      )}

      <section className="card">
        <div className="panel-head">
          <div>
            <h2>Environment</h2>
            <p className="muted">Runtime values that affect session behavior and support contact.</p>
          </div>
        </div>
        <div className="settings-grid">
          <div>
            <p className="muted">Demo mode</p>
            <p>{appConfig.enableDemoMode ? 'Enabled' : 'Disabled'}</p>
          </div>
          <div>
            <p className="muted">Session timeout</p>
            <p>{appConfig.sessionTimeoutMinutes} minutes</p>
          </div>
          <div>
            <p className="muted">App name</p>
            <p>{appConfig.appName}</p>
          </div>
          <div>
            <p className="muted">App subtitle</p>
            <p>{appConfig.appSubtitle}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="panel-head">
          <div>
            <h2>Recent activity</h2>
            <p className="muted">The latest project and invoice mutations recorded in local storage.</p>
          </div>
          <Link className="link-inline" to="/dashboard">
            Return to dashboard
          </Link>
        </div>
        {activities.length === 0 ? (
          <p className="muted">No activity has been recorded yet.</p>
        ) : (
          <ul className="list">
            {activities.slice(0, 8).map((activity) => (
              <li className="list-item" key={activity.id}>
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

      {isAdmin ? (
        <section className="card">
          <h2>Admin note</h2>
          <p>
            Admin users can create, edit, and delete projects and invoices. Client users can only read
            what belongs to their account.
          </p>
        </section>
      ) : null}
    </div>
  )
}
