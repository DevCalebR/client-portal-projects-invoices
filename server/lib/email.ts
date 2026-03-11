import { NotificationType, type BillingPlan, type Client, type Invoice, type Organization, type Project, type User } from '@prisma/client'
import { getResend } from './resend'
import { serverEnv } from '../config/env'

const sendEmail = async (to: string, subject: string, html: string) => {
  if (!serverEnv.resendApiKey) {
    return
  }

  const resend = getResend()
  await resend.emails.send({
    from: serverEnv.resendFromEmail,
    to,
    subject,
    html,
  })
}

export const sendInvoiceCreatedEmail = async ({
  invoice,
  client,
  organization,
}: {
  invoice: Invoice
  client: Client
  organization: Organization
}) =>
  sendEmail(
    client.billingEmail ?? client.email,
    `${organization.name}: invoice #${invoice.invoiceNumber} is ready`,
    `<p>Hi ${client.name},</p><p>A new invoice (#${invoice.invoiceNumber}) is available in ${organization.name}.</p><p>You can review it in the client portal.</p>`,
  )

export const sendInvoicePaidEmail = async ({
  invoice,
  client,
  organization,
}: {
  invoice: Invoice
  client: Client
  organization: Organization
}) =>
  sendEmail(
    client.billingEmail ?? client.email,
    `${organization.name}: payment received for invoice #${invoice.invoiceNumber}`,
    `<p>Hi ${client.name},</p><p>We received payment for invoice #${invoice.invoiceNumber}. Thank you.</p>`,
  )

export const sendProjectUpdatedEmail = async ({
  project,
  client,
  organization,
}: {
  project: Project
  client: Client
  organization: Organization
}) =>
  sendEmail(
    client.email,
    `${organization.name}: project update for ${project.name}`,
    `<p>Hi ${client.name},</p><p>Your project <strong>${project.name}</strong> was updated. Current status: ${project.status.replaceAll('_', ' ')}.</p>`,
  )

export const sendTeamInvitationEmail = async ({
  email,
  inviter,
  organization,
  role,
}: {
  email: string
  inviter: User
  organization: Organization
  role: string
}) =>
  sendEmail(
    email,
    `${organization.name}: you’ve been invited to the client portal`,
    `<p>${inviter.fullName} invited you to join ${organization.name} as ${role.toLowerCase()}.</p><p>Use the invite link in Clerk to accept access.</p>`,
  )

export const sendPlanChangedEmail = async ({
  email,
  organization,
  plan,
}: {
  email: string
  organization: Organization
  plan: BillingPlan
}) =>
  sendEmail(
    email,
    `${organization.name}: subscription updated`,
    `<p>Your workspace is now on the ${plan.toLowerCase()} plan.</p>`,
  )

export const notificationTypeToEmail = {
  invoiceCreated: NotificationType.INVOICE_CREATED,
  invoicePaid: NotificationType.INVOICE_PAID,
  projectUpdated: NotificationType.PROJECT_UPDATED,
  teamInvite: NotificationType.TEAM_INVITE,
}
