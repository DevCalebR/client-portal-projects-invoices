import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Notice } from '../components/Notice'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/FeedbackContext'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_OPTIONS, type ProjectInput } from '../types/entities'
import { getInputDate, toIsoDate } from '../utils/format'
import { logAppError } from '../utils/logger'

const projectSchema = z.object({
  name: z.string().trim().min(2, 'Project name is required.'),
  description: z.string().trim().max(4000, 'Keep project scope under 4000 characters.').optional(),
  clientId: z.string().trim().min(1, 'Assign a client.'),
  status: z.enum(PROJECT_STATUS_OPTIONS),
  dueDate: z.string().optional(),
})

type ProjectFormValues = z.infer<typeof projectSchema>

export const ProjectFormPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { notify } = useFeedback()
  const isEdit = Boolean(id)
  const { clients, createProject, updateProject, getProject, isLoading } = useData()

  const existing = isEdit && id ? getProject(id) : null

  const defaultValues = useMemo<ProjectFormValues>(
    () => ({
      name: existing?.name ?? '',
      description: existing?.description ?? '',
      clientId: existing?.client.id ?? clients[0]?.id ?? '',
      status: existing?.status ?? 'PLANNING',
      dueDate: getInputDate(existing?.dueDate ?? undefined),
    }),
    [clients, existing],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!isLoading) {
      reset(defaultValues)
    }
  }, [defaultValues, isLoading, reset])

  const onSubmit = async (values: ProjectFormValues) => {
    const payload: ProjectInput = {
      name: values.name,
      description: values.description || undefined,
      clientId: values.clientId,
      status: values.status,
      dueDate: values.dueDate ? toIsoDate(values.dueDate) : null,
    }

    try {
      if (isEdit && id) {
        const updated = await updateProject(id, payload)
        notify({
          title: 'Project updated',
          message: `${updated.name} was saved successfully.`,
          tone: 'success',
        })
        navigate(`/projects/${id}`)
        return
      }

      const created = await createProject(payload)
      notify({
        title: 'Project created',
        message: `${created.name} is ready for delivery tracking.`,
        tone: 'success',
      })
      navigate(`/projects/${created.id}`)
    } catch (error) {
      logAppError(error, { scope: 'ProjectFormPage.submit', projectId: id ?? 'new' })
      setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'Unable to save this project.',
      })
    }
  }

  if (isLoading) {
    return (
      <section className="card">
        <p className="loading-placeholder">Loading project details...</p>
      </section>
    )
  }

  if (isEdit && !existing) {
    return (
      <section className="card">
        <h1>Project not found</h1>
        <p>This project does not exist or is no longer accessible.</p>
        <Link className="btn btn--primary" to="/projects">
          Back to projects
        </Link>
      </section>
    )
  }

  if (!isEdit && clients.length === 0) {
    return (
      <section className="card">
        <h1>No clients available</h1>
        <p className="muted">Create a client record in Settings before creating projects.</p>
        <Link className="btn btn--primary" to="/settings">
          Open settings
        </Link>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="panel-head panel-head--tight">
        <h1>{isEdit ? 'Edit project' : 'Create new project'}</h1>
      </div>
      <form className="form-stack" onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
        {errors.root?.message ? (
          <Notice title="Unable to save project" message={errors.root.message} tone="error" />
        ) : null}

        <label>
          Project name
          <input
            {...register('name')}
            placeholder="Retention analytics dashboard"
            disabled={isSubmitting}
          />
          {errors.name ? <p className="error">{errors.name.message}</p> : null}
        </label>

        <label>
          Client
          <select {...register('clientId')} disabled={isSubmitting}>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {`${client.name}${client.company ? ` • ${client.company}` : ''}`}
              </option>
            ))}
          </select>
          {errors.clientId ? <p className="error">{errors.clientId.message}</p> : null}
        </label>

        <label>
          Status
          <select {...register('status')} disabled={isSubmitting}>
            {PROJECT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {errors.status ? <p className="error">{errors.status.message}</p> : null}
        </label>

        <label>
          Due date
          <input {...register('dueDate')} type="date" disabled={isSubmitting} />
          {errors.dueDate ? <p className="error">{errors.dueDate.message}</p> : null}
        </label>

        <label>
          Scope and notes
          <textarea {...register('description')} rows={6} disabled={isSubmitting} />
          {errors.description ? <p className="error">{errors.description.message}</p> : null}
        </label>

        <div className="form-actions">
          <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create project'}
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => navigate('/projects')}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}
