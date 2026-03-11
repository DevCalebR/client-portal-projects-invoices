import { NotificationType, type Prisma } from '@prisma/client'
import { db } from './db'

export const createNotifications = async (
  notifications: Prisma.NotificationCreateManyInput[],
) => {
  if (notifications.length === 0) {
    return
  }

  await db.notification.createMany({
    data: notifications,
  })
}

export const createActivityEvent = async (data: Prisma.ActivityEventUncheckedCreateInput) =>
  db.activityEvent.create({
    data,
  })

export const notificationTypeTitles: Record<NotificationType, string> = {
  INVOICE_CREATED: 'New invoice',
  INVOICE_PAID: 'Invoice paid',
  PROJECT_UPDATED: 'Project updated',
  TEAM_INVITE: 'Team invitation',
  SYSTEM: 'System update',
}

