import type { ProjectStatus, InvoiceStatus } from '../types/entities'
import { PROJECT_STATUS_LABELS, INVOICE_STATUS_LABELS } from '../types/entities'

type StatusBadgeProps =
  | {
      type: 'project'
      status: ProjectStatus
    }
  | {
      type: 'invoice'
      status: InvoiceStatus
    }

const getProjectClass = (status: ProjectStatus): string => {
  switch (status) {
    case 'planning':
      return 'badge badge--info'
    case 'in_progress':
      return 'badge badge--info'
    case 'review':
      return 'badge badge--warning'
    case 'completed':
      return 'badge badge--success'
    default:
      return 'badge'
  }
}

const getInvoiceClass = (status: InvoiceStatus): string => {
  switch (status) {
    case 'paid':
      return 'badge badge--success'
    case 'unpaid':
      return 'badge badge--warning'
    case 'overdue':
      return 'badge badge--danger'
    case 'draft':
      return 'badge badge--neutral'
    default:
      return 'badge'
  }
}

export const StatusBadge = ({ type, status }: StatusBadgeProps) => {
  if (type === 'project') {
    return <span className={getProjectClass(status)}>{PROJECT_STATUS_LABELS[status]}</span>
  }

  return <span className={getInvoiceClass(status)}>{INVOICE_STATUS_LABELS[status]}</span>
}
