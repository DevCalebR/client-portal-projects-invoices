import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/FeedbackContext'
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_OPTIONS,
  isAdminUser,
  type InvoiceStatus,
} from '../types/entities'
import { logAppError } from '../utils/logger'
import { formatCurrency, formatDate } from '../utils/format'

const normalizeStatus = (value: string): InvoiceStatus | 'all' =>
  INVOICE_STATUS_OPTIONS.includes(value as InvoiceStatus) ? (value as InvoiceStatus) : 'all'

export const InvoicesPage = () => {
  const navigate = useNavigate()
  const { user, users } = useAuth()
  const { invoices, isLoading, projects, deleteInvoice } = useData()
  const { notify } = useFeedback()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const clientNameById = useMemo(
    () => new Map(users.map((person) => [person.id, person.name])),
    [users],
  )

  const visibleInvoices = useMemo(() => {
    const scope = isAdminUser(user)
      ? invoices
      : invoices.filter((invoice) => invoice.clientId === user?.id)

    return scope.map((invoice) => ({
      ...invoice,
      projectName:
        projects.find((project) => project.id === invoice.projectId)?.name ?? 'Unknown project',
      clientName: clientNameById.get(invoice.clientId) ?? invoice.clientId,
    }))
  }, [invoices, projects, user, clientNameById])

  const filtered = useMemo(
    () =>
      visibleInvoices
        .filter(
          (invoice) =>
            invoice.projectName.toLowerCase().includes(search.toLowerCase()) ||
            invoice.clientName.toLowerCase().includes(search.toLowerCase()) ||
            invoice.id.toLowerCase().includes(search.toLowerCase()),
        )
        .filter((invoice) => (statusFilter === 'all' ? true : invoice.status === statusFilter)),
    [search, statusFilter, visibleInvoices],
  )

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  const handleDelete = (invoiceId: string) => {
    const shouldDelete = window.confirm(`Delete invoice ${invoiceId}? This cannot be undone.`)

    if (!shouldDelete) {
      return
    }

    try {
      setPendingDeleteId(invoiceId)
      deleteInvoice(invoiceId)
      notify({
        title: 'Invoice deleted',
        message: `${invoiceId} was removed from the ledger.`,
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

  if (!user) {
    return null
  }

  return (
    <div className="page-stack">
      <div className="page-head page-head--actions">
        <div>
          <h1>{isAdminUser(user) ? 'All Invoices' : 'My Invoices'}</h1>
          <p>{filtered.length} invoice(s) found</p>
        </div>
        {isAdminUser(user) ? (
          <button className="btn btn--primary" onClick={() => navigate('/invoices/new')} type="button">
            Add invoice
          </button>
        ) : null}
      </div>

      <section className="card filter-bar">
        <input
          placeholder="Search by invoice id, project, or client"
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
            isAdminUser(user)
              ? 'Try adjusting search and status filters or create a new invoice.'
              : 'No invoices are assigned to your account at this time.'
          }
          action={
            isAdminUser(user) ? (
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
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link to={`/invoices/${invoice.id}`}>{invoice.id}</Link>
                    </td>
                    <td>{invoice.projectName}</td>
                    <td>{invoice.clientName}</td>
                    <td>
                      <StatusBadge type="invoice" status={invoice.status} />
                    </td>
                    <td>{formatDate(invoice.dueDate)}</td>
                    <td>{formatCurrency(invoice.total)}</td>
                    <td className="actions">
                      <Link to={`/invoices/${invoice.id}`}>View</Link>
                      {isAdminUser(user) ? (
                        <>
                          <Link to={`/invoices/${invoice.id}/edit`}>Edit</Link>
                          <button
                            className="btn btn--danger btn--sm"
                            onClick={() => handleDelete(invoice.id)}
                            type="button"
                            disabled={pendingDeleteId === invoice.id}
                          >
                            {pendingDeleteId === invoice.id ? 'Deleting...' : 'Delete'}
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
      ) : null}
    </div>
  )
}
