import { OrganizationRole } from '@prisma/client'
import { Router } from 'express'
import { ensureRequestContext, getRequestContext } from '../lib/auth.js'
import { asyncHandler } from '../lib/http.js'
import { db } from '../lib/db.js'
import { serializeActivity } from '../lib/serializers.js'

export const activityRouter = Router()

activityRouter.use(
  asyncHandler(async (request, _response, next) => {
    await ensureRequestContext(request)
    next()
  }),
)

activityRouter.get(
  '/activity',
  asyncHandler(async (request, response) => {
    const context = getRequestContext(request)
    const activity = await db.activityEvent.findMany({
      where: {
        organizationId: context.organization!.id,
        ...(context.role === OrganizationRole.CLIENT && context.clientProfile
          ? { clientId: context.clientProfile.id }
          : {}),
      },
      include: {
        actor: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    })

    response.json({
      activity: activity.map(serializeActivity),
    })
  }),
)
