import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useFieldArray, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import {
  INVOICE_STATUS_OPTIONS,
  INVOICE_STATUS_LABELS,
  type InvoiceInput,
  isAdminUser,
} from '../types/entities'
import { calculateInvoiceSubtotal, formatCurrency, getInputDate } from '../utils/format'

const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().trim().min(3, 'Describe the work item.'),
  quantity: z.number().min(1, 'Quantity must be at least 1.'),
  rate: z.number().min(0.01, 'Rate must be greater than 0.'),
})

const invoiceSchema = z
  .object({
    projectId: z.string().min(1, 'Choose a project.'),
    clientId: z.string().min(1, 'Choose a client.'),
    status: z.enum(INVOICE_STATUS_OPTIONS),
    issueDate: z.string().min(1, 'Issue date is required.'),
    dueDate: z.string().min(1, 'Due date is required.'),
    notes: z.string().trim().max(1000, 'Keep notes under 1000 characters.').optional(),
    lineItems: z.array(lineItemSchema).min(1, 'Add at least one line item.'),
  })
  .superRefine((data, context) => {
    const issue = Date.parse(data.issueDate)
    const due = Date.parse(data.dueDate)

    if (Number.isNaN(issue)) {
      context.addIssue({
        path: ['issueDate'],
        code: z.ZodIssueCode.custom,
        message: 'Issue date is invalid.',
      })
      return
    }

    if (Number.isNaN(due)) {
      context.addIssue({
        path: ['dueDate'],
        code: z.ZodIssueCode.custom,
        message: 'Due date is invalid.',
      })
      return
    }

    if (due < issue) {
      context.addIssue({
        path: ['dueDate'],
        code: z.ZodIssueCode.custom,
        message: 'Due date must be on or after issue date.',
      })
    }
  })

type InvoiceFormValues = z.infer<typeof invoiceSchema>

export const InvoiceFormPage = () => {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryProjectId = searchParams.get('projectId')
  const {
    projects,
    createInvoice,
    updateInvoice,
    getInvoice,
    getProject,
    isLoading,
  } = useData()

  const currentInvoice = isEdit && id ? getInvoice(id) : null
  const prefillProject = queryProjectId ? projects.find((project) => project.id === queryProjectId) : null

  const initialDate = getInputDate(new Date().toISOString())
  const activeProjectOptions = projects

  const initialValues = useMemo<InvoiceFormValues>(
    () => ({
      projectId: currentInvoice?.projectId ?? prefillProject?.id ?? activeProjectOptions[0]?.id ?? '',
      clientId:
        currentInvoice?.clientId ?? prefillProject?.clientId ?? activeProjectOptions[0]?.clientId ?? '',
      status: currentInvoice?.status ?? 'draft',
      issueDate: currentInvoice ? getInputDate(currentInvoice.issueDate) : initialDate,
      dueDate: currentInvoice ? getInputDate(currentInvoice.dueDate) : initialDate,
      notes: currentInvoice?.notes ?? '',
      lineItems:
        currentInvoice?.lineItems.map((lineItem) => ({
          id: lineItem.id,
          description: lineItem.description,
          quantity: lineItem.quantity,
          rate: lineItem.rate,
        })) ?? [
          { id: undefined, description: '', quantity: 1, rate: 0 },
        ],
    }),
    [activeProjectOptions, currentInvoice, initialDate, prefillProject?.clientId, prefillProject?.id],
  )

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  })

  useEffect(() => {
    if (!isLoading) {
      reset(initialValues)
    }
  }, [initialValues, isLoading, reset])

  const projectId = useWatch({ control, name: 'projectId' })
  const lineItems = useWatch({ control, name: 'lineItems' })

  const subtotal = useMemo(() => calculateInvoiceSubtotal(lineItems ?? []), [lineItems])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  })

  useEffect(() => {
    if (!projectId) {
      return
    }

    const project = getProject(projectId)
    if (!project) {
      return
    }

    setValue('clientId', project.clientId)
  }, [getProject, projectId, setValue])

  const onSubmit: SubmitHandler<InvoiceFormValues> = (values) => {
    if (!user || !isAdminUser(user)) {
      navigate('/invoices', { replace: true })
      return
    }

    const payload: InvoiceInput = {
      projectId: values.projectId,
      clientId: values.clientId,
      status: values.status,
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      notes: values.notes ?? '',
      lineItems: values.lineItems.map((lineItem) => ({
        id: lineItem.id,
        description: lineItem.description,
        quantity: lineItem.quantity,
        rate: lineItem.rate,
      })),
    }

    if (isEdit && id) {
      updateInvoice(id, payload)
      navigate(`/invoices/${id}`)
      return
    }

    const created = createInvoice(payload)
    navigate(`/invoices/${created.id}`)
  }

  if (!user || !isAdminUser(user)) {
    return null
  }

  if (!isLoading && activeProjectOptions.length === 0) {
    return (
      <section className="card">
        <h1>Can't create an invoice yet</h1>
        <p className="muted">
          No projects are available yet. Create a project first, then return to build an invoice.
        </p>
        <Link className="btn btn--primary" to="/projects/new">
          Create a project
        </Link>
      </section>
    )
  }

  return (
    <section className="card">
      <div className="panel-head panel-head--tight">
        <h1>{isEdit ? 'Edit invoice' : 'Create new invoice'}</h1>
        <Link className="link-inline" to="/invoices">
          Back
        </Link>
      </div>
      <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Project
          <select {...register('projectId')} disabled={isSubmitting}>
            {activeProjectOptions.length === 0 ? <option value="">No projects available</option> : null}
            {activeProjectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {errors.projectId ? <p className="error">{errors.projectId.message}</p> : null}
        </label>

        <label>
          Client
          <input {...register('clientId')} readOnly disabled={isSubmitting} />
          {errors.clientId ? <p className="error">{errors.clientId.message}</p> : null}
        </label>

        <label>
          Status
          <select {...register('status')} disabled={isSubmitting}>
            {INVOICE_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {INVOICE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {errors.status ? <p className="error">{errors.status.message}</p> : null}
        </label>

        <div className="form-row">
          <label>
            Issue date
            <input type="date" {...register('issueDate')} disabled={isSubmitting} />
            {errors.issueDate ? <p className="error">{errors.issueDate.message}</p> : null}
          </label>
          <label>
            Due date
            <input type="date" {...register('dueDate')} disabled={isSubmitting} />
            {errors.dueDate ? <p className="error">{errors.dueDate.message}</p> : null}
          </label>
        </div>

        <label>
          Invoice notes
          <textarea {...register('notes')} rows={4} disabled={isSubmitting} />
          {errors.notes ? <p className="error">{errors.notes.message}</p> : null}
        </label>

        <section className="line-item-section">
          <div className="line-item-head">
            <h2>Line items</h2>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => append({ description: '', quantity: 1, rate: 0 })}
            >
              Add line
            </button>
          </div>

          {fields.map((field, index) => (
            <div className="line-item-grid" key={field.id}>
              <label>
                Description
                <input
                  {...register(`lineItems.${index}.description` as const)}
                  placeholder="Design review"
                  disabled={isSubmitting}
                />
                {errors.lineItems?.[index]?.description ? (
                  <p className="error">{errors.lineItems[index]?.description?.message}</p>
                ) : null}
              </label>
              <label>
                Qty
                <input
                  type="number"
                  step="1"
                  min="1"
                  disabled={isSubmitting}
                  {...register(`lineItems.${index}.quantity` as const, {
                    valueAsNumber: true,
                  })}
                />
                {errors.lineItems?.[index]?.quantity ? (
                  <p className="error">{errors.lineItems[index]?.quantity?.message}</p>
                ) : null}
              </label>
              <label>
                Rate
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={isSubmitting}
                  {...register(`lineItems.${index}.rate` as const, {
                    valueAsNumber: true,
                  })}
                />
                {errors.lineItems?.[index]?.rate ? (
                  <p className="error">{errors.lineItems[index]?.rate?.message}</p>
                ) : null}
              </label>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                Remove
              </button>
            </div>
          ))}

          {errors.lineItems ? <p className="error">{errors.lineItems.message as string}</p> : null}

          <p className="totals-preview">Subtotal preview: {formatCurrency(subtotal)}</p>
        </section>

        <div className="form-actions">
          <button className="btn btn--primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save invoice' : 'Create invoice'}
          </button>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => navigate('/invoices')}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}
