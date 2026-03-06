import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { INVOICE_STATUS_OPTIONS, INVOICE_STATUS_LABELS, type InvoiceStatus, isAdminUser } from '../types/entities'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState } from '../components/EmptyState'
import { formatCurrency, formatDate } from '../utils/format'

const normalizeStatus = (value: string): InvoiceStatus | 'all' =>
  INVOICE_STATUS_OPTIONS.includes(value as InvoiceStatus) ? (value as InvoiceStatus) : 'all'

export const InvoicesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { invoices, isLoading, projects, deleteInvoice } = useData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all')

  const visibleInvoices = useMemo(() => {
    const scope = isAdminUser(user)
      ? invoices
      : invoices.filter((invoice) => invoice.clientId === user?.id)

    return scope.map((invoice) => ({
      ...invoice,
      projectName:
        projects.find((project) => project.id === invoice.projectId)?.name ?? 'Unknown project',
    }))
  }, [invoices, projects, user])

  const filtered = useMemo(
    () =>
      visibleInvoices
        .filter(
          (invoice) =>
            invoice.projectName.toLowerCase().includes(search.toLowerCase()) ||
            invoice.id.toLowerCase().includes(search.toLowerCase()),
        )
        .filter((invoice) => (statusFilter === 'all' ? true : invoice.status === statusFilter)),
    [search, statusFilter, visibleInvoices],
  )

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
          placeholder="Search by invoice id or project"
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
                            onClick={() => deleteInvoice(invoice.id)}
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
      ) : null}
    </div>
  )
}
