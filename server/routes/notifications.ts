import { Router } from 'express'
import { ensureRequestContext, getRequestContext } from '../lib/auth'
import { asyncHandler, AppError, getRouteParam } from '../lib/http'
import { db } from '../lib/db'
import { serializeNotification } from '../lib/serializers'

export const notificationsRouter = Router()

notificationsRouter.use(
  asyncHandler(async (request, _response, next) => {
    await ensureRequestContext(request)
    next()
  }),
)

notificationsRouter.get(
  '/notifications',
  asyncHandler(async (request, response) => {
    const context = getRequestContext(request)
    const notifications = await db.notification.findMany({
      where: {
        organizationId: context.organization!.id,
        userId: context.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    response.json({
      notifications: notifications.map(serializeNotification),
    })
  }),
)

notificationsRouter.patch(
  '/notifications/:id/read',
  asyncHandler(async (request, response) => {
    const context = getRequestContext(request)
    const notificationId = getRouteParam(request.params.id, 'id')
    const notification = await db.notification.findFirst({
      where: {
        id: notificationId,
        organizationId: context.organization!.id,
        userId: context.user.id,
      },
    })

    if (!notification) {
      throw new AppError(404, 'Notification not found.', 'NOTIFICATION_NOT_FOUND')
    }

    const updated = await db.notification.update({
      where: { id: notification.id },
      data: {
        readAt: notification.readAt ?? new Date(),
      },
    })

    response.json({
      notification: serializeNotification(updated),
    })
  }),
)
