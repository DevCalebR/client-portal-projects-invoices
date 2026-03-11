import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/FeedbackContext'
import type { ActivityEvent, Payment } from '../types/entities'
import { isInternalRole } from '../types/entities'
import { formatCurrency, formatDate, formatDateTime } from '../utils/format'
import { logAppError } from '../utils/logger'

export const InvoiceDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { membership } = useAuth()
  const { getInvoice, isLoading, fetchInvoiceDetail, createCheckout } = useData()
  const { notify } = useFeedback()
  const [payments, setPayments] = useState<Payment[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [loadingDetails, setLoadingDetails] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!id) {
        return
      }

      setLoadingDetails(true)

      try {
        const detail = await fetchInvoiceDetail(id)
        setPayments(detail.payments)
        setActivity(detail.activity)
      } finally {
        setLoadingDetails(false)
      }
    }

    void load()
  }, [fetchInvoiceDetail, id])

  if (!id) {
    return null
  }

  if (isLoading) {
    return (
      <section className="card">
        <p className="loading-placeholder">Loading invoice details...</p>
      </section>
    )
  }

  const invoice = getInvoice(id)

  if (!invoice) {
    return (
      <EmptyState
        title="Invoice not found"
        message="That invoice was not found or is outside your current organization scope."
        action={
          <Link className="btn btn--primary" to="/invoices">
            Back to invoices
          </Link>
        }
      />
    )
  }

  const canManage = isInternalRole(membership?.role)
  const canPay = !canManage && invoice.balanceDue > 0 && ['OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)

  const handlePayNow = async () => {
    try {
      setPaying(true)
      const response = await createCheckout({
        kind: 'invoice',
        invoiceId: invoice.id,
      })

      if (response.url) {
        window.location.href = response.url
      }
    } catch (error) {
      logAppError(error, { scope: 'InvoiceDetailPage.payNow', invoiceId: invoice.id })
      notify({
        title: 'Unable to start payment',
        message: error instanceof Error ? error.message : 'Please try again.',
        tone: 'error',
      })
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="panel-head panel-head--tight">
        <div>
          <h1>Invoice #{invoice.invoiceNumber}</h1>
          <p>{invoice.project ? `Project: ${invoice.project.name}` : 'Standalone invoice'}</p>
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
            <p>{invoice.client.name}</p>
            <small className="muted">{invoice.client.company ?? invoice.client.email}</small>
          </div>
        </div>

        <p className="note-block">{invoice.notes || 'No invoice notes were provided.'}</p>

        <div className="panel-actions">
          {invoice.project ? (
            <Link to={`/projects/${invoice.project.id}`} className="btn btn--ghost">
              View project
            </Link>
          ) : null}
          {canManage ? (
            <Link to={`/invoices/${invoice.id}/edit`} className="btn btn--primary">
              Edit invoice
            </Link>
          ) : null}
          {canPay ? (
            <button className="btn btn--primary" type="button" onClick={() => void handlePayNow()} disabled={paying}>
              {paying ? 'Redirecting…' : 'Pay with Stripe'}
            </button>
          ) : null}
        </div>
      </section>

      <div className="split-grid">
        <section className="card">
          <h2>Line items</h2>
          {invoice.items.length === 0 ? (
            <p className="muted">No line items found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Payments</h2>
          {loadingDetails ? <p className="loading-placeholder">Loading payment activity...</p> : null}
          {!loadingDetails && payments.length === 0 ? (
            <p className="muted">No payment attempts have been recorded yet.</p>
          ) : (
            <ul className="list">
              {payments.map((payment) => (
                <li key={payment.id} className="list-item">
                  <div>
                    <strong>{formatCurrency(payment.amount)}</strong>
                    <small>{payment.paidAt ? formatDateTime(payment.paidAt) : 'Awaiting payment confirmation'}</small>
                  </div>
                  <StatusBadge type="payment" status={payment.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="panel-head">
          <h2>Activity</h2>
        </div>
        {loadingDetails ? <p className="loading-placeholder">Loading activity...</p> : null}
        {!loadingDetails && activity.length === 0 ? (
          <p className="muted">No activity has been recorded for this invoice yet.</p>
        ) : (
          <ul className="list">
            {activity.map((entry) => (
              <li className="list-item" key={entry.id}>
                <div>
                  <strong>{entry.message}</strong>
                  <small>{entry.actor?.fullName ?? 'System'}</small>
                </div>
                <small className="muted">{formatDateTime(entry.createdAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card totals-card">
        <div>
          <span>Subtotal</span>
          <strong>{formatCurrency(invoice.subtotal)}</strong>
        </div>
        <div>
          <span>Paid</span>
          <strong>{formatCurrency(invoice.amountPaid)}</strong>
        </div>
        <div>
          <span>Balance due</span>
          <strong>{formatCurrency(invoice.balanceDue)}</strong>
        </div>
      </section>
    </div>
  )
}
