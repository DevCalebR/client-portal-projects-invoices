import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { isAdminUser, type ProjectStatus, PROJECT_STATUS_OPTIONS, PROJECT_STATUS_LABELS } from '../types/entities'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState } from '../components/EmptyState'
import { formatDate } from '../utils/format'

const projectStatusFromValue = (value: string): ProjectStatus | 'all' => {
  return PROJECT_STATUS_OPTIONS.includes(value as ProjectStatus) ? (value as ProjectStatus) : 'all'
}

export const ProjectsPage = () => {
  const navigate = useNavigate()
  const { user, users } = useAuth()
  const { projects, isLoading, deleteProject } = useData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all')

  const getClientName = (clientId: string) =>
    users.find((person) => person.id === clientId)?.name ?? clientId

  if (!user) {
    return null
  }

  const canEdit = isAdminUser(user)

  const visibleProjects = projects.filter((project) =>
    canEdit ? true : project.clientId === user.id,
  )

  const filteredProjects = visibleProjects
    .filter((project) => {
      const lowered = search.toLowerCase()
      const haystack = `${project.name} ${getClientName(project.clientId)} ${project.notes}`.toLowerCase()
      return haystack.includes(lowered)
    })
    .filter((project) => (statusFilter === 'all' ? true : project.status === statusFilter))

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  return (
    <div className="page-stack">
      <div className="page-head page-head--actions">
        <div>
          <h1>{canEdit ? 'All Projects' : 'My Projects'}</h1>
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
          placeholder="Search by project name, client, notes"
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
              ? 'Try adjusting search and status filters or create a new project from the button above.'
              : 'No assigned projects match the current filters.'
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
                    <td>{getClientName(project.clientId)}</td>
                    <td>
                      <StatusBadge type="project" status={project.status} />
                    </td>
                    <td>{formatDate(project.dueDate)}</td>
                    <td>{formatDate(project.updatedAt)}</td>
                    <td className="actions">
                      <Link to={`/projects/${project.id}`}>View</Link>
                      {canEdit ? (
                        <>
                          <Link to={`/projects/${project.id}/edit`}>Edit</Link>
                          <button
                            className="btn btn--danger btn--sm"
                            onClick={() => deleteProject(project.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </>
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
