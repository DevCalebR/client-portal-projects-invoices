import { ActivitySubjectType, InvoiceStatus, NotificationType, OrganizationRole } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { ensureRequestContext, ensureRole, getRequestContext } from '../lib/auth'
import { asyncHandler, getRouteParam, parseBody, AppError } from '../lib/http'
import { db } from '../lib/db'
import { createActivityEvent, createNotifications, notificationTypeTitles } from '../lib/notifications'
import { serializeActivity, serializeInvoice, serializePayment } from '../lib/serializers'
import { sendInvoiceCreatedEmail } from '../lib/email'

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().positive(),
})

const invoiceSchema = z.object({
  clientId: z.string().trim().min(1),
  projectId: z.string().trim().min(1).nullable().optional(),
  status: z.nativeEnum(InvoiceStatus),
  issueDate: z.string().datetime(),
  dueDate: z.string().datetime(),
  notes: z.string().trim().max(4000).optional(),
  items: z.array(invoiceItemSchema).min(1),
})

const computeTotals = (items: Array<{ quantity: number; unitPrice: number }>) =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

export const invoicesRouter = Router()

invoicesRouter.use(
  asyncHandler(async (request, _response, next) => {
    await ensureRequestContext(request)
    next()
  }),
)

invoicesRouter.get(
  '/invoices',
  asyncHandler(async (request, response) => {
    const context = getRequestContext(request)
    const invoices = await db.invoice.findMany({
      where: {
        organizationId: context.organization!.id,
        ...(context.role === OrganizationRole.CLIENT && context.clientProfile
          ? { clientId: context.clientProfile.id }
          : {}),
      },
      include: {
        client: true,
        project: true,
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    response.json({
      invoices: invoices.map(serializeInvoice),
    })
  }),
)

invoicesRouter.post(
  '/invoices',
  asyncHandler(async (request, response) => {
    const context = ensureRole(request, [OrganizationRole.ADMIN, OrganizationRole.MANAGER], 'Only internal team members can create invoices.')
    const payload = parseBody(invoiceSchema, request.body)

    const client = await db.client.findFirst({
      where: {
        id: payload.clientId,
        organizationId: context.organization!.id,
      },
    })

    if (!client) {
      throw new AppError(404, 'Client not found.', 'CLIENT_NOT_FOUND')
    }

    if (payload.projectId) {
      const project = await db.project.findFirst({
        where: {
          id: payload.projectId,
          organizationId: context.organization!.id,
          clientId: client.id,
        },
      })

      if (!project) {
        throw new AppError(404, 'Project not found for this client.', 'PROJECT_NOT_FOUND')
      }
    }

    const totals = computeTotals(payload.items)
    const aggregate = await db.invoice.aggregate({
      where: {
        organizationId: context.organization!.id,
      },
      _max: {
        invoiceNumber: true,
      },
    })

    const invoice = await db.invoice.create({
      data: {
        organizationId: context.organization!.id,
        clientId: client.id,
        projectId: payload.projectId,
        invoiceNumber: (aggregate._max.invoiceNumber ?? 1000) + 1,
        status: payload.status,
        issueDate: new Date(payload.issueDate),
        dueDate: new Date(payload.dueDate),
        subtotal: totals,
        total: totals,
        balanceDue: totals,
        amountPaid: 0,
        notes: payload.notes,
        createdById: context.user.id,
        updatedById: context.user.id,
        items: {
          create: payload.items.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            sortOrder: index,
          })),
        },
      },
      include: {
        client: true,
        project: true,
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    await createActivityEvent({
      organizationId: context.organization!.id,
      actorId: context.user.id,
      subjectType: ActivitySubjectType.INVOICE,
      subjectId: invoice.id,
      invoiceId: invoice.id,
      clientId: client.id,
      projectId: invoice.projectId,
      message: `Created invoice #${invoice.invoiceNumber}.`,
    })

    const clientMember = client.memberId
      ? await db.organizationMember.findUnique({
          where: { id: client.memberId },
        })
      : null

    if (clientMember?.userId) {
      await createNotifications([
        {
          organizationId: context.organization!.id,
          userId: clientMember.userId,
          memberId: clientMember.id,
          type: NotificationType.INVOICE_CREATED,
          title: notificationTypeTitles.INVOICE_CREATED,
          message: `Invoice #${invoice.invoiceNumber} is ready to review.`,
          link: `/invoices/${invoice.id}`,
        },
      ])
    }

    await sendInvoiceCreatedEmail({
      invoice,
      client,
      organization: context.organization!,
    })

    response.status(201).json({
      invoice: serializeInvoice(invoice),
    })
  }),
)

invoicesRouter.get(
  '/invoices/:id',
  asyncHandler(async (request, response) => {
    const context = getRequestContext(request)
    const invoiceId = getRouteParam(request.params.id, 'id')
    const invoice = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: context.organization!.id,
        ...(context.role === OrganizationRole.CLIENT && context.clientProfile
          ? { clientId: context.clientProfile.id }
          : {}),
      },
      include: {
        client: true,
        project: true,
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!invoice) {
      throw new AppError(404, 'Invoice not found.', 'INVOICE_NOT_FOUND')
    }

    const activities = await db.activityEvent.findMany({
      where: {
        organizationId: context.organization!.id,
        invoiceId: invoice.id,
      },
      include: {
        actor: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    response.json({
      invoice: serializeInvoice(invoice),
      payments: invoice.payments.map(serializePayment),
      activity: activities.map(serializeActivity),
    })
  }),
)

invoicesRouter.patch(
  '/invoices/:id',
  asyncHandler(async (request, response) => {
    const context = ensureRole(request, [OrganizationRole.ADMIN, OrganizationRole.MANAGER], 'Only internal team members can update invoices.')
    const payload = parseBody(invoiceSchema.partial(), request.body)
    const invoiceId = getRouteParam(request.params.id, 'id')

    const existing = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: context.organization!.id,
      },
      include: {
        client: true,
      },
    })

    if (!existing) {
      throw new AppError(404, 'Invoice not found.', 'INVOICE_NOT_FOUND')
    }

    const items = payload.items ?? []
    const totals = items.length > 0 ? computeTotals(items) : Number(existing.total.toString())
    const amountPaid = Number(existing.amountPaid.toString())
    const invoice = await db.invoice.update({
      where: { id: existing.id },
      data: {
        clientId: payload.clientId,
        projectId: payload.projectId === undefined ? undefined : payload.projectId,
        status: payload.status,
        issueDate: payload.issueDate ? new Date(payload.issueDate) : undefined,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
        subtotal: totals,
        total: totals,
        balanceDue: Math.max(totals - amountPaid, 0),
        notes: payload.notes,
        updatedById: context.user.id,
        items: payload.items
          ? {
              deleteMany: {},
              create: payload.items.map((item, index) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.quantity * item.unitPrice,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        client: true,
        project: true,
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    await createActivityEvent({
      organizationId: context.organization!.id,
      actorId: context.user.id,
      subjectType: ActivitySubjectType.INVOICE,
      subjectId: invoice.id,
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      projectId: invoice.projectId,
      message: `Updated invoice #${invoice.invoiceNumber}.`,
    })

    response.json({
      invoice: serializeInvoice(invoice),
    })
  }),
)

invoicesRouter.delete(
  '/invoices/:id',
  asyncHandler(async (request, response) => {
    const context = ensureRole(request, [OrganizationRole.ADMIN], 'Only admins can delete invoices.')
    const invoiceId = getRouteParam(request.params.id, 'id')
    const existing = await db.invoice.findFirst({
      where: {
        id: invoiceId,
        organizationId: context.organization!.id,
      },
    })

    if (!existing) {
      throw new AppError(404, 'Invoice not found.', 'INVOICE_NOT_FOUND')
    }

    await db.invoice.delete({
      where: { id: existing.id },
    })

    await createActivityEvent({
      organizationId: context.organization!.id,
      actorId: context.user.id,
      subjectType: ActivitySubjectType.INVOICE,
      subjectId: existing.id,
      message: `Deleted invoice #${existing.invoiceNumber}.`,
    })

    response.status(204).send()
  }),
)
