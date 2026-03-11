import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/FeedbackContext'
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_OPTIONS, isAdminRole, isInternalRole, type InvoiceStatus } from '../types/entities'
import { logAppError } from '../utils/logger'
import { formatCurrency, formatDate } from '../utils/format'

const normalizeStatus = (value: string): InvoiceStatus | 'all' =>
  INVOICE_STATUS_OPTIONS.includes(value as InvoiceStatus) ? (value as InvoiceStatus) : 'all'

export const InvoicesPage = () => {
  const navigate = useNavigate()
  const { membership } = useAuth()
  const { invoices, isLoading, deleteInvoice } = useData()
  const { notify } = useFeedback()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const canCreate = isInternalRole(membership?.role)
  const canDelete = isAdminRole(membership?.role)

  const filtered = useMemo(
    () =>
      invoices
        .filter((invoice) => {
          const lowered = search.toLowerCase()
          const haystack = `${invoice.invoiceNumber} ${invoice.client.name} ${invoice.project?.name ?? ''}`.toLowerCase()
          return haystack.includes(lowered)
        })
        .filter((invoice) => (statusFilter === 'all' ? true : invoice.status === statusFilter)),
    [search, statusFilter, invoices],
  )

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  const handleDelete = async (invoiceId: string, invoiceNumber: number) => {
    const shouldDelete = window.confirm(`Delete invoice #${invoiceNumber}? This cannot be undone.`)

    if (!shouldDelete) {
      return
    }

    try {
      setPendingDeleteId(invoiceId)
      await deleteInvoice(invoiceId)
      notify({
        title: 'Invoice deleted',
        message: `Invoice #${invoiceNumber} was removed.`,
        tone: 'success',
      })
    } catch (error) {
      logAppError(error, { scope: 'InvoicesPage.deleteInvoice', invoiceId })
      notify({
        title: 'Unable to delete invoice',
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
          <h1>{canCreate ? 'Invoices' : 'My Invoices'}</h1>
          <p>{filtered.length} invoice(s) found</p>
        </div>
        {canCreate ? (
          <button className="btn btn--primary" onClick={() => navigate('/invoices/new')} type="button">
            Add invoice
          </button>
        ) : null}
      </div>

      <section className="card filter-bar">
        <input
          placeholder="Search by invoice number, client, or project"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(normalizeStatus(event.target.value))}
        >
          <option value="all">All statuses</option>
          {INVOICE_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {INVOICE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <button className="btn btn--ghost" type="button" onClick={clearFilters}>
          Clear filters
        </button>
      </section>

      {isLoading ? <p className="loading-placeholder">Loading invoices...</p> : null}

      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          title="No invoices found"
          message={
            canCreate
              ? 'Try adjusting search and status filters or create a new invoice.'
              : 'No invoices are currently assigned to your workspace account.'
          }
          action={
            canCreate ? (
              <Link className="btn btn--primary" to="/invoices/new">
                Create invoice
              </Link>
            ) : undefined
          }
        />
      ) : null}

      {!isLoading && filtered.length > 0 ? (
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Balance due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link to={`/invoices/${invoice.id}`}>#{invoice.invoiceNumber}</Link>
                    </td>
                    <td>{invoice.project?.name ?? 'Unlinked'}</td>
                    <td>{invoice.client.name}</td>
                    <td>
                      <StatusBadge type="invoice" status={invoice.status} />
                    </td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td>{formatCurrency(invoice.balanceDue)}</td>
                    <td className="actions">
                      <Link to={`/invoices/${invoice.id}`}>View</Link>
                      {canCreate ? <Link to={`/invoices/${invoice.id}/edit`}>Edit</Link> : null}
                      {canDelete ? (
                        <button
                          className="btn btn--danger btn--sm"
                          onClick={() => void handleDelete(invoice.id, invoice.invoiceNumber)}
                          type="button"
                          disabled={pendingDeleteId === invoice.id}
                        >
                          {pendingDeleteId === invoice.id ? 'Deleting...' : 'Delete'}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
