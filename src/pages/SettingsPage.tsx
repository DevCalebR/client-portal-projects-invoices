import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { isAdminUser } from '../types/entities'

export const SettingsPage = () => {
  const { user } = useAuth()
  const { resetDemoData } = useData()

  if (!user) {
    return null
  }

  const handleReset = () => {
    const shouldReset = window.confirm(
      'This will replace current projects/invoices with seed data. Continue?',
    )

    if (shouldReset) {
      resetDemoData()
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
        </div>
      </section>

      <section className="card">
        <h2>Storage behavior</h2>
        <p>
          Data is stored with stable localStorage keys and seeded demo content is only written if local keys
          are missing. Use this for realistic portfolio demos without a backend.
        </p>
        <button className="btn btn--primary" onClick={handleReset}>
          Restore seeded demo data
        </button>
      </section>

      {isAdminUser(user) ? (
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
