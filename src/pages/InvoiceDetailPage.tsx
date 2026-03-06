import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { isAdminUser } from '../types/entities'
import { formatCurrency, formatDate } from '../utils/format'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState } from '../components/EmptyState'

export const InvoiceDetailPage = () => {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getInvoice, getProject, isLoading } = useData()

  if (!user || !id) {
    return null
  }

  const invoice = getInvoice(id)

  if (!invoice) {
    return (
      <EmptyState
        title="Invoice not found"
        message="That invoice was not found or was removed."
      />
    )
  }

  if (user.role === 'client' && invoice.clientId !== user.id) {
    navigate('/invoices', { replace: true })
    return null
  }

  const project = getProject(invoice.projectId)
  const projectName = project?.name ?? 'Project unavailable'

  const totals = invoice.lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0)

  return (
    <div className="page-stack">
      <div className="panel-head panel-head--tight">
        <div>
          <h1>Invoice {invoice.id}</h1>
          <p>Project: {projectName}</p>
        </div>
        <Link to="/invoices" className="btn btn--ghost">
          Back
        </Link>
      </div>

      <section className="card">
        <div className="detail-grid">
          <div>
            <p className="muted">Status</p>
            <StatusBadge type="invoice" status={invoice.status} />
          </div>
          <div>
            <p className="muted">Issue date</p>
            <p>{formatDate(invoice.issueDate)}</p>
          </div>
          <div>
            <p className="muted">Due date</p>
            <p>{formatDate(invoice.dueDate)}</p>
          </div>
          <div>
            <p className="muted">Client</p>
            <p>{invoice.clientId}</p>
          </div>
        </div>

        <p className="note-block">{invoice.notes || 'No invoice notes were provided.'}</p>

        {isAdminUser(user) ? (
          <div className="panel-actions">
            <Link to={`/invoices/${invoice.id}/edit`} className="btn btn--primary">
              Edit invoice
            </Link>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h2>Line items</h2>
        {isLoading ? <p className="loading-placeholder">Loading line items...</p> : null}

        {!isLoading && invoice.lineItems.length === 0 ? (
          <p className="muted">No line items found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Line total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.rate)}</td>
                    <td>{formatCurrency(item.quantity * item.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card totals-card">
        <div>
          <span>Subtotal</span>
          <strong>{formatCurrency(invoice.subtotal ?? totals)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{formatCurrency(invoice.total ?? totals)}</strong>
        </div>
      </section>
    </div>
  )
}
