import type { InvoiceStatus, PaymentStatus, ProjectStatus } from '../types/entities'
import { INVOICE_STATUS_LABELS, PROJECT_STATUS_LABELS } from '../types/entities'

type StatusBadgeProps =
  | {
      type: 'project'
      status: ProjectStatus
    }
  | {
      type: 'invoice'
      status: InvoiceStatus
    }
  | {
      type: 'payment'
      status: PaymentStatus
    }

const getProjectClass = (status: ProjectStatus): string => {
  switch (status) {
    case 'PLANNING':
    case 'IN_PROGRESS':
      return 'badge badge--info'
    case 'REVIEW':
    case 'ON_HOLD':
      return 'badge badge--warning'
    case 'COMPLETED':
      return 'badge badge--success'
    default:
      return 'badge'
  }
}

const getInvoiceClass = (status: InvoiceStatus): string => {
  switch (status) {
    case 'PAID':
      return 'badge badge--success'
    case 'OPEN':
    case 'SENT':
    case 'PARTIALLY_PAID':
      return 'badge badge--warning'
    case 'OVERDUE':
      return 'badge badge--danger'
    case 'DRAFT':
    case 'VOID':
      return 'badge badge--neutral'
    default:
      return 'badge'
  }
}

const getPaymentClass = (status: PaymentStatus): string => {
  switch (status) {
    case 'SUCCEEDED':
      return 'badge badge--success'
    case 'PENDING':
      return 'badge badge--warning'
    case 'FAILED':
    case 'CANCELED':
      return 'badge badge--danger'
    case 'REFUNDED':
      return 'badge badge--neutral'
    default:
      return 'badge'
  }
}

export const StatusBadge = ({ type, status }: StatusBadgeProps) => {
  if (type === 'project') {
    return <span className={getProjectClass(status)}>{PROJECT_STATUS_LABELS[status]}</span>
  }

  if (type === 'invoice') {
    return <span className={getInvoiceClass(status)}>{INVOICE_STATUS_LABELS[status]}</span>
  }

  return <span className={getPaymentClass(status)}>{status.replaceAll('_', ' ')}</span>
}
