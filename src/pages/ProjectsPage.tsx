import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/FeedbackContext'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_OPTIONS, isAdminRole, isInternalRole, type ProjectStatus } from '../types/entities'
import { logAppError } from '../utils/logger'
import { formatDate } from '../utils/format'

const projectStatusFromValue = (value: string): ProjectStatus | 'all' =>
  PROJECT_STATUS_OPTIONS.includes(value as ProjectStatus) ? (value as ProjectStatus) : 'all'

export const ProjectsPage = () => {
  const navigate = useNavigate()
  const { membership } = useAuth()
  const { projects, isLoading, deleteProject } = useData()
  const { notify } = useFeedback()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const canEdit = isInternalRole(membership?.role)
  const canDelete = isAdminRole(membership?.role)

  const filteredProjects = projects
    .filter((project) => {
      const lowered = search.toLowerCase()
      const haystack = `${project.name} ${project.client.name} ${project.description ?? ''}`.toLowerCase()
      return haystack.includes(lowered)
    })
    .filter((project) => (statusFilter === 'all' ? true : project.status === statusFilter))

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  const handleDelete = async (projectId: string, projectName: string) => {
    const shouldDelete = window.confirm(
      `Delete "${projectName}"? This will remove the project from the organization workspace.`,
    )

    if (!shouldDelete) {
      return
    }

    try {
      setPendingDeleteId(projectId)
      await deleteProject(projectId)
      notify({
        title: 'Project deleted',
        message: `"${projectName}" was removed from the workspace.`,
        tone: 'success',
      })
    } catch (error) {
      logAppError(error, { scope: 'ProjectsPage.deleteProject', projectId })
      notify({
        title: 'Unable to delete project',
        message: error instanceof Error ? error.message : 'Please try again.',
        tone: 'error',
      })
    } finally {
      setPendingDeleteId(null)
    }
  }

  return (
    <div className="page-stack">
      <div className="page-head page-head--actions">
        <div>
          <h1>{canEdit ? 'Projects' : 'My Projects'}</h1>
          <p>{filteredProjects.length} project(s) found</p>
        </div>
        {canEdit ? (
          <button className="btn btn--primary" onClick={() => navigate('/projects/new')} type="button">
            Add project
          </button>
        ) : null}
      </div>

      <section className="card filter-bar">
        <input
          placeholder="Search by project name, client, or description"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(projectStatusFromValue(event.target.value) as 'all' | ProjectStatus)
          }
        >
          <option value="all">All statuses</option>
          {PROJECT_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {PROJECT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn--ghost" onClick={clearFilters}>
          Clear filters
        </button>
      </section>

      {isLoading ? <p className="loading-placeholder">Loading projects...</p> : null}

      {!isLoading && filteredProjects.length === 0 ? (
        <EmptyState
          title="No projects found"
          message={
            canEdit
              ? 'Try adjusting search and status filters or create a new project.'
              : 'No assigned projects match the current filters.'
          }
          action={
            canEdit ? (
              <Link className="btn btn--primary" to="/projects/new">
                Create project
              </Link>
            ) : undefined
          }
        />
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link to={`/projects/${project.id}`}>{project.name}</Link>
                    </td>
                    <td>{project.client.name}</td>
                    <td>
                      <StatusBadge type="project" status={project.status} />
                    </td>
                    <td>{formatDate(project.dueDate ?? undefined)}</td>
                    <td>{formatDate(project.updatedAt)}</td>
                    <td className="actions">
                      <Link to={`/projects/${project.id}`}>View</Link>
                      {canEdit ? <Link to={`/projects/${project.id}/edit`}>Edit</Link> : null}
                      {canDelete ? (
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => void handleDelete(project.id, project.name)}
                          type="button"
                          disabled={pendingDeleteId === project.id}
                        >
                          {pendingDeleteId === project.id ? 'Deleting...' : 'Delete'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
