import { BillingPlan, InvoiceStatus, NotificationType, OrganizationRole, PaymentStatus, PaymentType, SubscriptionStatus } from '@prisma/client'
import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { ensureRequestContext, ensureRole, getRequestContext } from '../lib/auth.js'
import { asyncHandler, parseBody, AppError } from '../lib/http.js'
import { db } from '../lib/db.js'
import { serverEnv } from '../config/env.js'
import { getStripe } from '../lib/stripe.js'
import { createActivityEvent, createNotifications, notificationTypeTitles } from '../lib/notifications.js'
import { sendInvoicePaidEmail, sendPlanChangedEmail } from '../lib/email.js'
import { serializePayment } from '../lib/serializers.js'

const checkoutSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('subscription'),
    plan: z.enum(['STARTER', 'PROFESSIONAL', 'AGENCY']),
  }),
  z.object({
    kind: z.literal('invoice'),
    invoiceId: z.string().trim().min(1),
  }),
])

export const paymentsRouter = Router()

paymentsRouter.use(
  asyncHandler(async (request, _response, next) => {
    await ensureRequestContext(request)
    next()
  }),
)

const ensureStripeCustomer = async ({
  organizationId,
  organizationName,
  billingEmail,
}: {
  organizationId: string
  organizationName: string
  billingEmail: string
}) => {
  const stripe = getStripe()
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
  })

  if (organization.stripeCustomerId) {
    return organization.stripeCustomerId
  }

  const customer = await stripe.customers.create({
    email: billingEmail,
    name: organizationName,
    metadata: {
      organizationId,
    },
  })

  await db.organization.update({
    where: { id: organizationId },
    data: {
      stripeCustomerId: customer.id,
    },
  })

  return customer.id
}

paymentsRouter.post(
  '/payments/create-checkout',
  asyncHandler(async (request, response) => {
    const context = getRequestContext(request)
    const payload = parseBody(checkoutSchema, request.body)
    const stripe = getStripe()

    if (payload.kind === 'subscription') {
      ensureRole(request, [OrganizationRole.ADMIN], 'Only admins can manage subscription billing.')
      const priceId = serverEnv.stripePriceIds[payload.plan]

      if (!priceId) {
        throw new AppError(500, `Stripe price for ${payload.plan.toLowerCase()} is not configured.`, 'STRIPE_PRICE_NOT_CONFIGURED')
      }

      const customerId = await ensureStripeCustomer({
        organizationId: context.organization!.id,
        organizationName: context.organization!.name,
        billingEmail: context.organization!.billingEmail ?? context.user.email,
      })

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${serverEnv.appUrl}/settings?billing=success`,
        cancel_url: `${serverEnv.appUrl}/settings?billing=cancelled`,
        metadata: {
          kind: 'subscription',
          plan: payload.plan,
          organizationId: context.organization!.id,
        },
      })

      return response.status(201).json({
        url: session.url,
      })
    }

    const invoice = await db.invoice.findFirst({
      where: {
        id: payload.invoiceId,
        organizationId: context.organization!.id,
        ...(context.role === OrganizationRole.CLIENT && context.clientProfile
          ? { clientId: context.clientProfile.id }
          : {}),
      },
      include: {
        client: true,
      },
    })

    if (!invoice) {
      throw new AppError(404, 'Invoice not found.', 'INVOICE_NOT_FOUND')
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError(400, 'This invoice is already paid.', 'INVOICE_ALREADY_PAID')
    }

    const customerId = await ensureStripeCustomer({
      organizationId: context.organization!.id,
      organizationName: context.organization!.name,
      billingEmail: invoice.client.billingEmail ?? invoice.client.email,
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: `Invoice #${invoice.invoiceNumber}`,
            },
            unit_amount: Math.round(Number(invoice.balanceDue.toString()) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${serverEnv.appUrl}/invoices/${invoice.id}?payment=success`,
      cancel_url: `${serverEnv.appUrl}/invoices/${invoice.id}?payment=cancelled`,
      metadata: {
        kind: 'invoice',
        organizationId: context.organization!.id,
        invoiceId: invoice.id,
      },
    })

    const payment = await db.payment.create({
      data: {
        organizationId: context.organization!.id,
        invoiceId: invoice.id,
        type: PaymentType.INVOICE,
        status: PaymentStatus.PENDING,
        amount: invoice.balanceDue,
        currency: invoice.currency,
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: customerId,
      },
    })

    return response.status(201).json({
      url: session.url,
      payment: serializePayment(payment),
    })
  }),
)

paymentsRouter.post(
  '/payments/customer-portal',
  asyncHandler(async (request, response) => {
    const context = ensureRole(request, [OrganizationRole.ADMIN], 'Only admins can manage the customer portal.')
    const stripe = getStripe()
    const customerId = await ensureStripeCustomer({
      organizationId: context.organization!.id,
      organizationName: context.organization!.name,
      billingEmail: context.organization!.billingEmail ?? context.user.email,
    })

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${serverEnv.appUrl}/settings`,
    })

    response.status(201).json({
      url: session.url,
    })
  }),
)

export const handleStripeWebhook = async (request: Request, response: Response) => {
  const stripe = getStripe()
  const signature = request.headers['stripe-signature']

  if (typeof signature !== 'string' || !serverEnv.stripeWebhookSecret) {
    throw new AppError(400, 'Stripe webhook signature is missing.', 'STRIPE_SIGNATURE_MISSING')
  }

  const rawBody =
    request.body instanceof Buffer ? request.body : Buffer.from(typeof request.body === 'string' ? request.body : '')

  const event = stripe.webhooks.constructEvent(rawBody, signature, serverEnv.stripeWebhookSecret)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const organizationId = session.metadata?.organizationId

    if (session.mode === 'subscription' && organizationId) {
      const plan = (session.metadata?.plan as BillingPlan | undefined) ?? BillingPlan.STARTER

      const organization = await db.organization.update({
        where: { id: organizationId },
        data: {
          plan,
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
        },
      })

      if (organization.billingEmail) {
        await sendPlanChangedEmail({
          email: organization.billingEmail,
          organization,
          plan,
        })
      }
    }

    if (session.mode === 'payment' && session.metadata?.invoiceId && organizationId) {
      const payment = await db.payment.findFirst({
        where: {
          organizationId,
          stripeCheckoutSessionId: session.id,
        },
      })

      const invoice = await db.invoice.findFirst({
        where: {
          id: session.metadata.invoiceId,
          organizationId,
        },
        include: { client: true },
      })

      if (payment && invoice) {
        const amountPaid = Number(invoice.total.toString())
        await db.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCEEDED,
            stripePaymentIntentId:
              typeof session.payment_intent === 'string' ? session.payment_intent : null,
            paidAt: new Date(),
          },
        })

        await db.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.PAID,
            amountPaid,
            balanceDue: 0,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === 'string' ? session.payment_intent : null,
          },
        })

        const member = invoice.client.memberId
          ? await db.organizationMember.findUnique({ where: { id: invoice.client.memberId } })
          : null

        if (member?.userId) {
          await createNotifications([
            {
              organizationId,
              userId: member.userId,
              memberId: member.id,
              type: NotificationType.INVOICE_PAID,
              title: notificationTypeTitles.INVOICE_PAID,
              message: `Invoice #${invoice.invoiceNumber} was marked as paid.`,
              link: `/invoices/${invoice.id}`,
            },
          ])
        }

        await createActivityEvent({
          organizationId,
          subjectType: 'PAYMENT',
          subjectId: payment.id,
          invoiceId: invoice.id,
          paymentId: payment.id,
          clientId: invoice.clientId,
          message: `Invoice #${invoice.invoiceNumber} was paid via Stripe checkout.`,
        })

        const organization = await db.organization.findUniqueOrThrow({ where: { id: organizationId } })
        await sendInvoicePaidEmail({
          invoice,
          client: invoice.client,
          organization,
        })
      }
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : null

    if (customerId) {
      const organization = await db.organization.findFirst({
        where: { stripeCustomerId: customerId },
      })

      if (organization) {
        const status =
          subscription.status === 'active'
            ? SubscriptionStatus.ACTIVE
            : subscription.status === 'trialing'
              ? SubscriptionStatus.TRIALING
              : subscription.status === 'past_due'
                ? SubscriptionStatus.PAST_DUE
                : SubscriptionStatus.CANCELED

        await db.organization.update({
          where: { id: organization.id },
          data: {
            subscriptionStatus: status,
            stripeSubscriptionId: subscription.id,
          },
        })
      }
    }
  }

  response.json({ received: true })
}
