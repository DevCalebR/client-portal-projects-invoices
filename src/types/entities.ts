export type OrganizationRole = 'ADMIN' | 'MANAGER' | 'CLIENT'

export type MembershipStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED'

export type BillingPlan = 'STARTER' | 'PROFESSIONAL' | 'AGENCY'

export type SubscriptionStatus = 'INACTIVE' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'ON_HOLD'

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'OPEN' | 'PAID' | 'PARTIALLY_PAID' | 'VOID' | 'OVERDUE'

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'CANCELED'

export type PaymentType = 'SUBSCRIPTION' | 'INVOICE'

export type NotificationType =
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'PROJECT_UPDATED'
  | 'TEAM_INVITE'
  | 'SYSTEM'

export type ActivitySubjectType = 'PROJECT' | 'INVOICE' | 'PAYMENT' | 'CLIENT' | 'SYSTEM'

export interface SessionUser {
  id: string
  clerkUserId: string
  email: string
  firstName?: string | null
  lastName?: string | null
  fullName: string
  avatarUrl?: string | null
}

export interface SessionOrganization {
  id: string
  clerkOrganizationId: string
  name: string
  slug: string
  plan: BillingPlan
  subscriptionStatus: SubscriptionStatus
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  stripeCurrentPeriodEnd?: string | null
  billingEmail?: string | null
}

export interface SessionMembership {
  id: string
  role: OrganizationRole
  status: MembershipStatus
}

export interface SessionMember {
  id: string
  role: OrganizationRole
  status: MembershipStatus
  user: SessionUser
}

export interface PendingInvitation {
  id: string
  emailAddress: string
  role: string
  status: string
  createdAt: number
}

export interface Client {
  id: string
  name: string
  company?: string | null
  email: string
  billingEmail?: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'LEAD'
  notes?: string | null
  portalAccessEnabled: boolean
  memberId?: string | null
}

export interface Project {
  id: string
  name: string
  description?: string | null
  status: ProjectStatus
  dueDate?: string | null
  startedAt?: string | null
  completedAt?: string | null
  client: Client
  createdAt: string
  updatedAt: string
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  sortOrder: number
}

export interface Invoice {
  id: string
  invoiceNumber: number
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  subtotal: number
  taxAmount: number
  total: number
  amountPaid: number
  balanceDue: number
  currency: string
  notes?: string | null
  stripeCheckoutSessionId?: string | null
  stripePaymentIntentId?: string | null
  stripeInvoiceId?: string | null
  stripeHostedUrl?: string | null
  client: Client
  project?: {
    id: string
    name: string
  } | null
  items: InvoiceItem[]
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  type: PaymentType
  status: PaymentStatus
  amount: number
  currency: string
  stripeCheckoutSessionId?: string | null
  stripePaymentIntentId?: string | null
  stripeSubscriptionId?: string | null
  paidAt?: string | null
  failureMessage?: string | null
  createdAt: string
  updatedAt: string
}

export interface ActivityEvent {
  id: string
  subjectType: ActivitySubjectType
  subjectId: string
  message: string
  metadata?: unknown
  actor: SessionUser | null
  projectId?: string | null
  invoiceId?: string | null
  paymentId?: string | null
  clientId?: string | null
  createdAt: string
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  link?: string | null
  metadata?: unknown
  readAt?: string | null
  createdAt: string
}

export interface AppSession {
  user: SessionUser | null
  organization: SessionOrganization | null
  membership: SessionMembership | null
  clientProfile: Client | null
  members: SessionMember[]
  invitations: PendingInvitation[]
}

export interface ProjectInput {
  name: string
  description?: string
  clientId: string
  status: ProjectStatus
  dueDate?: string | null
}

export interface InvoiceItemInput {
  description: string
  quantity: number
  unitPrice: number
}

export interface InvoiceInput {
  clientId: string
  projectId?: string | null
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  notes?: string
  items: InvoiceItemInput[]
}

export interface ClientInput {
  name: string
  company?: string
  email: string
  billingEmail?: string
  notes?: string
  portalAccessEnabled?: boolean
}

export interface TeamInviteInput {
  email: string
  role: OrganizationRole
}

export type CheckoutRequest =
  | {
      kind: 'subscription'
      plan: BillingPlan
    }
  | {
      kind: 'invoice'
      invoiceId: string
    }

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = [
  'PLANNING',
  'IN_PROGRESS',
  'REVIEW',
  'COMPLETED',
  'ON_HOLD',
]

export const INVOICE_STATUS_OPTIONS: InvoiceStatus[] = [
  'DRAFT',
  'SENT',
  'OPEN',
  'PAID',
  'PARTIALLY_PAID',
  'VOID',
  'OVERDUE',
]

export const BILLING_PLAN_OPTIONS: BillingPlan[] = ['STARTER', 'PROFESSIONAL', 'AGENCY']

export const TEAM_ROLE_OPTIONS: OrganizationRole[] = ['ADMIN', 'MANAGER', 'CLIENT']

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  OPEN: 'Open',
  PAID: 'Paid',
  PARTIALLY_PAID: 'Partially Paid',
  VOID: 'Void',
  OVERDUE: 'Overdue',
}

export const BILLING_PLAN_LABELS: Record<BillingPlan, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  AGENCY: 'Agency',
}

export const isAdminRole = (role?: OrganizationRole | null) => role === 'ADMIN'

export const isInternalRole = (role?: OrganizationRole | null) =>
  role === 'ADMIN' || role === 'MANAGER'
