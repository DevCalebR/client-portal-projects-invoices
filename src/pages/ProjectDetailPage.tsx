import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { isAdminUser } from '../types/entities'
import { formatDate } from '../utils/format'
import { StatusBadge } from '../components/StatusBadge'

export const ProjectDetailPage = () => {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { invoices, getProject } = useData()

  if (!user || !id) {
    return null
  }

  const project = getProject(id)

  if (!project) {
    return (
      <section className="card">
        <h1>Project not found</h1>
        <p>This project does not exist or has been removed.</p>
        <Link className="btn btn--primary" to="/projects">
          Back to projects
        </Link>
      </section>
    )
  }

  const canView = isAdminUser(user) || project.clientId === user.id
  if (!canView) {
    navigate('/projects', { replace: true })
    return null
  }

  const projectInvoices = invoices.filter((invoice) => invoice.projectId === project.id)

  return (
    <div className="page-stack">
      <div className="panel-head panel-head--tight">
        <div>
          <h1>{project.name}</h1>
          <p>{project.updatedAt ? `Updated ${formatDate(project.updatedAt)}` : ''}</p>
        </div>
        <Link className="btn btn--ghost" to="/projects">
          Back
        </Link>
      </div>

      <section className="card">
        <div className="detail-grid">
          <div>
            <p className="muted">Status</p>
            <StatusBadge type="project" status={project.status} />
          </div>
          <div>
            <p className="muted">Client ID</p>
            <p>{project.clientId}</p>
          </div>
          <div>
            <p className="muted">Due date</p>
            <p>{formatDate(project.dueDate)}</p>
          </div>
          <div>
            <p className="muted">Created</p>
            <p>{formatDate(project.createdAt)}</p>
          </div>
        </div>
        <p className="note-block">{project.notes || 'No notes provided.'}</p>
        {isAdminUser(user) ? (
          <div className="panel-actions">
            <Link to={`/projects/${project.id}/edit`} className="btn btn--primary">
              Edit project
            </Link>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h2>Invoices for this project</h2>
        {projectInvoices.length === 0 ? (
          <p className="muted">No invoices have been created for this project yet.</p>
        ) : (
          <ul className="list">
            {projectInvoices.map((invoice) => (
              <li className="list-item list-item--spread" key={invoice.id}>
                <div>
                  <Link to={`/invoices/${invoice.id}`}>{invoice.id}</Link>
                  <small>
                    Due {formatDate(invoice.dueDate)}
                  </small>
                </div>
                <StatusBadge type="invoice" status={invoice.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
