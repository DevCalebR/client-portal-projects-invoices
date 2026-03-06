export type Role = 'admin' | 'client'

export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed'

export type InvoiceStatus = 'draft' | 'unpaid' | 'paid' | 'overdue'

export interface PublicUser {
  id: string
  name: string
  email: string
  role: Role
  company?: string
}

export interface User extends PublicUser {
  password: string
}

export interface Project {
  id: string
  name: string
  clientId: string
  status: ProjectStatus
  dueDate?: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  rate: number
}

export interface Invoice {
  id: string
  projectId: string
  clientId: string
  status: InvoiceStatus
  lineItems: InvoiceLineItem[]
  subtotal: number
  total: number
  issueDate: string
  dueDate: string
  notes: string
  createdAt: string
  updatedAt: string
}

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = [
  'planning',
  'in_progress',
  'review',
  'completed',
]

export const INVOICE_STATUS_OPTIONS: InvoiceStatus[] = ['draft', 'unpaid', 'paid', 'overdue']

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  unpaid: 'Unpaid',
  paid: 'Paid',
  overdue: 'Overdue',
}

export const isClientUser = (user: PublicUser | null): boolean =>
  user?.role === 'client'

export const isAdminUser = (user: PublicUser | null): boolean =>
  user?.role === 'admin'

export interface ProjectInput {
  name: string
  clientId: string
  status: ProjectStatus
  dueDate?: string
  notes: string
}

export interface InvoiceInput {
  projectId: string
  clientId: string
  status: InvoiceStatus
  lineItems: Array<Omit<InvoiceLineItem, 'id'> & { id?: string }>
  issueDate: string
  dueDate: string
  notes: string
}
