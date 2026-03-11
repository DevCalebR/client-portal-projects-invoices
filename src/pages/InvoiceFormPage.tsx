import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useFieldArray, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Notice } from '../components/Notice'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/FeedbackContext'
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_OPTIONS,
  type InvoiceInput,
} from '../types/entities'
import { calculateInvoiceSubtotal, formatCurrency, getInputDate, toIsoDate } from '../utils/format'
import { logAppError } from '../utils/logger'

const lineItemSchema = z.object({
  description: z.string().trim().min(3, 'Describe the line item.'),
  quantity: z.number().min(1, 'Quantity must be at least 1.'),
  unitPrice: z.number().min(0.01, 'Unit price must be greater than 0.'),
})

const invoiceSchema = z
  .object({
    clientId: z.string().min(1, 'Choose a client.'),
    projectId: z.string().optional(),
    status: z.enum(INVOICE_STATUS_OPTIONS),
    issueDate: z.string().min(1, 'Issue date is required.'),
    dueDate: z.string().min(1, 'Due date is required.'),
    notes: z.string().trim().max(1000, 'Keep notes under 1000 characters.').optional(),
    items: z.array(lineItemSchema).min(1, 'Add at least one line item.'),
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
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { notify } = useFeedback()
  const [searchParams] = useSearchParams()
  const queryProjectId = searchParams.get('projectId')
  const { clients, projects, createInvoice, updateInvoice, getInvoice, isLoading } = useData()

  const currentInvoice = isEdit && id ? getInvoice(id) : null
  const prefillProject = queryProjectId ? projects.find((project) => project.id === queryProjectId) : null
  const initialDate = getInputDate(new Date().toISOString())

  const initialValues = useMemo<InvoiceFormValues>(
    () => ({
      clientId: currentInvoice?.client.id ?? prefillProject?.client.id ?? clients[0]?.id ?? '',
      projectId: currentInvoice?.project?.id ?? prefillProject?.id ?? '',
      status: currentInvoice?.status ?? 'DRAFT',
      issueDate: currentInvoice ? getInputDate(currentInvoice.issueDate) : initialDate,
      dueDate: currentInvoice ? getInputDate(currentInvoice.dueDate) : initialDate,
      notes: currentInvoice?.notes ?? '',
      items:
        currentInvoice?.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })) ?? [{ description: '', quantity: 1, unitPrice: 0.01 }],
    }),
    [clients, currentInvoice, initialDate, prefillProject],
  )

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    reset,
    setError,
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

  const clientId = useWatch({ control, name: 'clientId' })
  const items = useWatch({ control, name: 'items' })
  const clientProjects = useMemo(
    () => projects.filter((project) => project.client.id === clientId),
    [projects, clientId],
  )

  useEffect(() => {
    if (!clientId) {
      return
    }

    if (!clientProjects.some((project) => project.id === initialValues.projectId)) {
      setValue('projectId', '')
    }
  }, [clientId, clientProjects, initialValues.projectId, setValue])

  const subtotal = useMemo(
    () =>
      calculateInvoiceSubtotal(
        (items ?? []).map((item) => ({
          quantity: item.quantity,
          rate: item.unitPrice,
        })),
      ),
    [items],
  )

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const onSubmit: SubmitHandler<InvoiceFormValues> = async (values) => {
    const payload: InvoiceInput = {
      clientId: values.clientId,
      projectId: values.projectId || null,
      status: values.status,
      issueDate: toIsoDate(values.issueDate),
      dueDate: toIsoDate(values.dueDate),
      notes: values.notes ?? '',
      items: values.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    }

    try {
      if (isEdit && id) {
        const updated = await updateInvoice(id, payload)
        notify({
          title: 'Invoice updated',
          message: `Invoice #${updated.invoiceNumber} was saved successfully.`,
          tone: 'success',
        })
        navigate(`/invoices/${id}`)
        return
      }

      const created = await createInvoice(payload)
      notify({
        title: 'Invoice created',
        message: `Invoice #${created.invoiceNumber} is ready for review.`,
        tone: 'success',
      })
      navigate(`/invoices/${created.id}`)
    } catch (error) {
      logAppError(error, { scope: 'InvoiceFormPage.submit', invoiceId: id ?? 'new' })
      setError('root', {
        type: 'manual',
        message: error instanceof Error ? error.message : 'Unable to save this invoice.',
      })
    }
  }

  if (isLoading) {
    return (
      <section className="card">
        <p className="loading-placeholder">Loading invoice details...</p>
      </section>
    )
  }

  if (isEdit && !currentInvoice) {
    return (
      <section className="card">
        <h1>Invoice not found</h1>
        <p>This invoice does not exist and cannot be edited.</p>
        <Link className="btn btn--primary" to="/invoices">
          Back to invoices
        </Link>
      </section>
    )
  }

  if (clients.length === 0) {
    return (
      <section className="card">
        <h1>No clients available</h1>
        <p className="muted">
          Add a client record in Settings before creating invoices.
        </p>
        <Link className="btn btn--primary" to="/settings">
          Open settings
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
      <form className="form-stack" onSubmit={handleSubmit(onSubmit)} aria-busy={isSubmitting}>
        {errors.root?.message ? (
          <Notice title="Unable to save invoice" message={errors.root.message} tone="error" />
        ) : null}

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
          Project
          <select {...register('projectId')} disabled={isSubmitting}>
            <option value="">Unlinked invoice</option>
            {clientProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
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
              onClick={() => append({ description: '', quantity: 1, unitPrice: 0.01 })}
              disabled={isSubmitting}
            >
              Add line
            </button>
          </div>

          {fields.map((field, index) => (
            <div className="line-item-grid" key={field.id}>
              <label>
                Description
                <input
                  {...register(`items.${index}.description` as const)}
                  placeholder="Dashboard implementation milestone"
                  disabled={isSubmitting}
                />
                {errors.items?.[index]?.description ? (
                  <p className="error">{errors.items[index]?.description?.message}</p>
                ) : null}
              </label>
              <label>
                Qty
                <input
                  type="number"
                  step="1"
                  min="1"
                  disabled={isSubmitting}
                  {...register(`items.${index}.quantity` as const, {
                    valueAsNumber: true,
                  })}
                />
                {errors.items?.[index]?.quantity ? (
                  <p className="error">{errors.items[index]?.quantity?.message}</p>
                ) : null}
              </label>
              <label>
                Unit price
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={isSubmitting}
                  {...register(`items.${index}.unitPrice` as const, {
                    valueAsNumber: true,
                  })}
                />
                {errors.items?.[index]?.unitPrice ? (
                  <p className="error">{errors.items[index]?.unitPrice?.message}</p>
                ) : null}
              </label>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() => remove(index)}
                disabled={fields.length === 1 || isSubmitting}
              >
                Remove
              </button>
            </div>
          ))}

          {errors.items ? <p className="error">{errors.items.message as string}</p> : null}

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
