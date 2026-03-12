import { OrganizationRole } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { ensureRequestContext, ensureRole, getRequestContext } from '../lib/auth.js'
import { asyncHandler, getRouteParam, parseBody, AppError } from '../lib/http.js'
import { db } from '../lib/db.js'
import { serializeClient } from '../lib/serializers.js'

const clientCreateSchema = z.object({
  name: z.string().trim().min(2),
  company: z.string().trim().optional(),
  email: z.string().trim().email(),
  billingEmail: z.string().trim().email().optional(),
  notes: z.string().trim().max(2000).optional(),
  portalAccessEnabled: z.boolean().optional(),
})

const clientUpdateSchema = clientCreateSchema.partial()

export const clientsRouter = Router()

clientsRouter.use(
  asyncHandler(async (request, _response, next) => {
    await ensureRequestContext(request)
    next()
  }),
)

clientsRouter.get(
  '/clients',
  asyncHandler(async (request, response) => {
    const context = getRequestContext(request)
    const clients = await db.client.findMany({
      where: {
        organizationId: context.organization!.id,
        ...(context.role === OrganizationRole.CLIENT && context.clientProfile
          ? { id: context.clientProfile.id }
          : {}),
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    response.json({
      clients: clients.map(serializeClient),
    })
  }),
)

clientsRouter.post(
  '/clients',
  asyncHandler(async (request, response) => {
    const context = ensureRole(request, [OrganizationRole.ADMIN, OrganizationRole.MANAGER], 'Only internal team members can create clients.')
    const payload = parseBody(clientCreateSchema, request.body)

    const client = await db.client.create({
      data: {
        organizationId: context.organization!.id,
        name: payload.name,
        company: payload.company,
        email: payload.email,
        billingEmail: payload.billingEmail ?? payload.email,
        notes: payload.notes,
        portalAccessEnabled: payload.portalAccessEnabled ?? true,
      },
    })

    response.status(201).json({
      client: serializeClient(client),
    })
  }),
)

clientsRouter.patch(
  '/clients/:id',
  asyncHandler(async (request, response) => {
    const context = ensureRole(request, [OrganizationRole.ADMIN, OrganizationRole.MANAGER], 'Only internal team members can update clients.')
    const payload = parseBody(clientUpdateSchema, request.body)
    const clientId = getRouteParam(request.params.id, 'id')

    const existing = await db.client.findFirst({
      where: {
        id: clientId,
        organizationId: context.organization!.id,
      },
    })

    if (!existing) {
      throw new AppError(404, 'Client not found.', 'CLIENT_NOT_FOUND')
    }

    const client = await db.client.update({
      where: { id: existing.id },
      data: {
        name: payload.name,
        company: payload.company,
        email: payload.email,
        billingEmail: payload.billingEmail,
        notes: payload.notes,
        portalAccessEnabled: payload.portalAccessEnabled,
      },
    })

    response.json({
      client: serializeClient(client),
    })
  }),
)
