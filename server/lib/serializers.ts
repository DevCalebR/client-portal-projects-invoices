import { InvoiceStatus, ProjectStatus, type ActivityEvent, type BillingPlan, type Client, type Invoice, type InvoiceItem, type Notification, type Organization, type OrganizationMember, type Payment, type Project, type SubscriptionStatus, type User } from '@prisma/client'

const decimalToNumber = (value: { toString(): string } | number) =>
  typeof value === 'number' ? value : Number(value.toString())

export const serializeUser = (user: User) => ({
  id: user.id,
  clerkUserId: user.clerkUserId,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,
  avatarUrl: user.avatarUrl,
})

export const serializeOrganization = (organization: Organization) => ({
  id: organization.id,
  clerkOrganizationId: organization.clerkOrganizationId,
  name: organization.name,
  slug: organization.slug,
  plan: organization.plan as BillingPlan,
  subscriptionStatus: organization.subscriptionStatus as SubscriptionStatus,
  stripeCustomerId: organization.stripeCustomerId,
  stripeSubscriptionId: organization.stripeSubscriptionId,
  stripeCurrentPeriodEnd: organization.stripeCurrentPeriodEnd?.toISOString() ?? null,
  billingEmail: organization.billingEmail,
})

export const serializeMembership = (member: OrganizationMember) => ({
  id: member.id,
  role: member.role,
  status: member.status,
})

export const serializeClient = (client: Client & { member?: OrganizationMember | null }) => ({
  id: client.id,
  name: client.name,
  company: client.company,
  email: client.email,
  billingEmail: client.billingEmail,
  status: client.status,
  notes: client.notes,
  portalAccessEnabled: client.portalAccessEnabled,
  memberId: client.memberId,
})

export const serializeProject = (
  project: Project & {
    client: Client
  },
) => ({
  id: project.id,
  name: project.name,
  description: project.description,
  status: project.status as ProjectStatus,
  dueDate: project.dueDate?.toISOString() ?? null,
  startedAt: project.startedAt?.toISOString() ?? null,
  completedAt: project.completedAt?.toISOString() ?? null,
  client: serializeClient(project.client),
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
})

export const serializeInvoiceItem = (item: InvoiceItem) => ({
  id: item.id,
  description: item.description,
  quantity: item.quantity,
  unitPrice: decimalToNumber(item.unitPrice),
  total: decimalToNumber(item.total),
  sortOrder: item.sortOrder,
})

export const serializeInvoice = (
  invoice: Invoice & {
    client: Client
    project: Project | null
    items: InvoiceItem[]
  },
) => ({
  id: invoice.id,
  invoiceNumber: invoice.invoiceNumber,
  status: invoice.status as InvoiceStatus,
  issueDate: invoice.issueDate.toISOString(),
  dueDate: invoice.dueDate.toISOString(),
  subtotal: decimalToNumber(invoice.subtotal),
  taxAmount: decimalToNumber(invoice.taxAmount),
  total: decimalToNumber(invoice.total),
  amountPaid: decimalToNumber(invoice.amountPaid),
  balanceDue: decimalToNumber(invoice.balanceDue),
  currency: invoice.currency,
  notes: invoice.notes,
  stripeCheckoutSessionId: invoice.stripeCheckoutSessionId,
  stripePaymentIntentId: invoice.stripePaymentIntentId,
  stripeInvoiceId: invoice.stripeInvoiceId,
  stripeHostedUrl: invoice.stripeHostedUrl,
  client: serializeClient(invoice.client),
  project: invoice.project
    ? {
        id: invoice.project.id,
        name: invoice.project.name,
      }
    : null,
  items: invoice.items.map(serializeInvoiceItem),
  createdAt: invoice.createdAt.toISOString(),
  updatedAt: invoice.updatedAt.toISOString(),
})

export const serializePayment = (payment: Payment) => ({
  id: payment.id,
  type: payment.type,
  status: payment.status,
  amount: decimalToNumber(payment.amount),
  currency: payment.currency,
  stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
  stripePaymentIntentId: payment.stripePaymentIntentId,
  stripeSubscriptionId: payment.stripeSubscriptionId,
  paidAt: payment.paidAt?.toISOString() ?? null,
  failureMessage: payment.failureMessage,
  createdAt: payment.createdAt.toISOString(),
  updatedAt: payment.updatedAt.toISOString(),
})

export const serializeActivity = (
  activity: ActivityEvent & {
    actor?: User | null
  },
) => ({
  id: activity.id,
  subjectType: activity.subjectType,
  subjectId: activity.subjectId,
  message: activity.message,
  metadata: activity.metadata,
  actor: activity.actor ? serializeUser(activity.actor) : null,
  projectId: activity.projectId,
  invoiceId: activity.invoiceId,
  paymentId: activity.paymentId,
  clientId: activity.clientId,
  createdAt: activity.createdAt.toISOString(),
})

export const serializeNotification = (notification: Notification) => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  message: notification.message,
  link: notification.link,
  metadata: notification.metadata,
  readAt: notification.readAt?.toISOString() ?? null,
  createdAt: notification.createdAt.toISOString(),
})
