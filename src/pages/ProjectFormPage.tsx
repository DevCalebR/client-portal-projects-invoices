import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { isAdminUser, PROJECT_STATUS_OPTIONS, PROJECT_STATUS_LABELS, type ProjectInput } from '../types/entities'
import { getInputDate } from '../utils/format'

const projectSchema = z
  .object({
    name: z.string().trim().min(2, 'Project name is required.'),
    clientId: z.string().trim().min(5, 'Assign a client.'),
    status: z.enum(PROJECT_STATUS_OPTIONS),
    dueDate: z.string().optional(),
    notes: z.string().trim().max(1000, 'Keep notes under 1000 characters.').optional(),
  })
  .superRefine((data, context) => {
    if (!data.dueDate) {
      return
    }

    const parsed = Date.parse(data.dueDate)
    if (Number.isNaN(parsed)) {
      context.addIssue({
        path: ['dueDate'],
        code: z.ZodIssueCode.custom,
        message: 'Due date is invalid.',
      })
    }
  })

type ProjectFormValues = z.infer<typeof projectSchema>

export const ProjectFormPage = () => {
  const { user, users } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const {
    createProject,
    updateProject,
    getProject,
    isLoading,
  } = useData()

  const existing = isEdit && id ? getProject(id) : null

  const clientOptions = useMemo(
    () => users.filter((person) => person.role === 'client'),
    [users],
  )

  const defaultValues = useMemo<ProjectFormValues>(
    () => ({
      name: existing?.name ?? '',
      clientId: existing?.clientId ?? clientOptions[0]?.id ?? '',
      status: existing?.status ?? 'planning',
      dueDate: getInputDate(existing?.dueDate),
      notes: existing?.notes ?? '',
    }),
    [clientOptions, existing],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!isLoading) {
      reset(defaultValues)
    }
  }, [isLoading, defaultValues, reset])

  const onSubmit = (values: ProjectFormValues) => {
    const payload: ProjectInput = {
      ...values,
      dueDate: values.dueDate || undefined,
      notes: values.notes || '',
    }

    if (isEdit && id) {
      updateProject(id, payload)
      navigate(`/projects/${id}`)
      return
    }

    const created = createProject(payload)
    navigate(`/projects/${created.id}`)
  }

  if (!user || !isAdminUser(user)) {
    return null
  }

  if (isEdit && !existing && !isLoading) {
    return (
      <section className="card">
        <h1>Project not found</h1>
        <p>This project does not exist and cannot be edited.</p>
      </section>
    )
  }

  if (!isLoading && !isEdit && clientOptions.length === 0) {
    return (
      <section className="card">
        <h1>Client list unavailable</h1>
        <p className="muted">No client accounts are currently available. Add seeded clients first.</p>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="panel-head panel-head--tight">
        <h1>{isEdit ? 'Edit project' : 'Create new project'}</h1>
      </div>
      <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Project name
          <input
            {...register('name')}
            placeholder="Brand refresh, landing page, onboarding, etc."
            disabled={isSubmitting}
          />
          {errors.name ? <p className="error">{errors.name.message}</p> : null}
        </label>

        <label>
          Client
          <select {...register('clientId')} disabled={isSubmitting}>
            {clientOptions.length === 0 ? <option value="">No clients available</option> : null}
            {clientOptions.map((client) => (
              <option key={client.id} value={client.id}>
                {`${client.name}${client.company ? ` • ${client.company}` : ''}`}
              </option>
            ))}
          </select>
          {clientOptions.length === 0 ? (
            <p className="error">No client users are seeded. Add clients before creating projects.</p>
          ) : null}
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
          Notes
          <textarea {...register('notes')} rows={6} disabled={isSubmitting} />
          {errors.notes ? <p className="error">{errors.notes.message}</p> : null}
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
