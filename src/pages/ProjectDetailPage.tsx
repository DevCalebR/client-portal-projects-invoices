import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { useData } from '../context/DataContext'
import type { ActivityEvent } from '../types/entities'
import { formatDate, formatDateTime } from '../utils/format'

export const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { invoices, getProject, isLoading, fetchProjectDetail } = useData()
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [loadingActivity, setLoadingActivity] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!id) {
        return
      }

      setLoadingActivity(true)
      try {
        const detail = await fetchProjectDetail(id)
        setActivity(detail.activity)
      } finally {
        setLoadingActivity(false)
      }
    }

    void load()
  }, [fetchProjectDetail, id])

  if (!id) {
    return null
  }

  if (isLoading) {
    return (
      <section className="card">
        <p className="loading-placeholder">Loading project details...</p>
      </section>
    )
  }

  const project = getProject(id)

  if (!project) {
    return (
      <section className="card">
        <h1>Project not found</h1>
        <p>This project does not exist or has been removed from your scope.</p>
        <Link className="btn btn--primary" to="/projects">
          Back to projects
        </Link>
      </section>
    )
  }

  const projectInvoices = invoices.filter((invoice) => invoice.project?.id === project.id)

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
            <p className="muted">Client</p>
            <p>{project.client.name}</p>
            <small className="muted">{project.client.company ?? project.client.email}</small>
          </div>
          <div>
            <p className="muted">Due date</p>
            <p>{formatDate(project.dueDate ?? undefined)}</p>
          </div>
          <div>
            <p className="muted">Created</p>
            <p>{formatDate(project.createdAt)}</p>
          </div>
        </div>
        <p className="note-block">{project.description || 'No additional scope notes were provided.'}</p>
        <div className="panel-actions">
          <Link to={`/projects/${project.id}/edit`} className="btn btn--primary">
            Edit project
          </Link>
          <Link to={`/invoices/new?projectId=${project.id}`} className="btn btn--ghost">
            Create invoice
          </Link>
        </div>
      </section>

      <div className="split-grid">
        <section className="card">
          <h2>Invoices for this project</h2>
          {projectInvoices.length === 0 ? (
            <p className="muted">No invoices have been created for this project yet.</p>
          ) : (
            <ul className="list">
              {projectInvoices.map((invoice) => (
                <li className="list-item list-item--spread" key={invoice.id}>
                  <div>
                    <Link to={`/invoices/${invoice.id}`}>Invoice #{invoice.invoiceNumber}</Link>
                    <small>Due {formatDate(invoice.dueDate)}</small>
                  </div>
                  <StatusBadge type="invoice" status={invoice.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2>Recent activity</h2>
          {loadingActivity ? <p className="loading-placeholder">Loading activity...</p> : null}
          {!loadingActivity && activity.length === 0 ? (
            <p className="muted">No activity has been recorded for this project yet.</p>
          ) : (
            <ul className="list">
              {activity.slice(0, 5).map((entry) => (
                <li className="list-item" key={entry.id}>
                  <div>
                    <strong>{entry.message}</strong>
                    <small>{entry.actor?.fullName ?? 'System'}</small>
                  </div>
                  <small className="muted">{formatDateTime(entry.createdAt)}</small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
