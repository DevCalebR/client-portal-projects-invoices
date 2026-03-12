import { ActivitySubjectType, NotificationType, OrganizationRole, ProjectStatus } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { ensureRequestContext, ensureRole, getRequestContext } from '../lib/auth'
import { createActivityEvent, createNotifications, notificationTypeTitles } from '../lib/notifications'
import { asyncHandler, getRouteParam, parseBody, AppError } from '../lib/http'
import { db } from '../lib/db'
import { serializeActivity, serializeProject } from '../lib/serializers'
import { sendProjectUpdatedEmail } from '../lib/email'

const projectSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().max(4000).optional(),
  clientId: z.string().trim().min(1),
  status: z.nativeEnum(ProjectStatus),
  dueDate: z.string().datetime().nullable().optional(),
})

export const projectsRouter = Router()

projectsRouter.use(
  asyncHandler(async (request, _response, next) => {
    await ensureRequestContext(request)
    next()
  }),
)

projectsRouter.get(
  '/projects',
  asyncHandler(async (request, response) => {
    const context = getRequestContext(request)

    const projects = await db.project.findMany({
      where: {
        organizationId: context.organization!.id,
        ...(context.role === OrganizationRole.CLIENT && context.clientProfile
          ? { clientId: context.clientProfile.id }
          : {}),
      },
      include: {
        client: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    response.json({
      projects: projects.map(serializeProject),
    })
  }),
)

projectsRouter.post(
  '/projects',
  asyncHandler(async (request, response) => {
    const context = ensureRole(request, [OrganizationRole.ADMIN, OrganizationRole.MANAGER], 'Only internal team members can create projects.')
    const payload = parseBody(projectSchema, request.body)

    const client = await db.client.findFirst({
      where: {
        id: payload.clientId,
        organizationId: context.organization!.id,
      },
    })

    if (!client) {
      throw new AppError(404, 'Client not found for this organization.', 'CLIENT_NOT_FOUND')
    }

    const project = await db.project.create({
      data: {
        organizationId: context.organization!.id,
        clientId: client.id,
        name: payload.name,
        description: payload.description,
        status: payload.status,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        createdById: context.user.id,
        updatedById: context.user.id,
      },
      include: {
        client: true,
      },
    })

    await createActivityEvent({
      organizationId: context.organization!.id,
      actorId: context.user.id,
      subjectType: ActivitySubjectType.PROJECT,
      subjectId: project.id,
      projectId: project.id,
      clientId: client.id,
      message: `Created project ${project.name}.`,
    })

    response.status(201).json({
      project: serializeProject(project),
    })
  }),
)

projectsRouter.get(
  '/projects/:id',
  asyncHandler(async (request, response) => {
    const context = getRequestContext(request)
    const projectId = getRouteParam(request.params.id, 'id')
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        organizationId: context.organization!.id,
        ...(context.role === OrganizationRole.CLIENT && context.clientProfile
          ? { clientId: context.clientProfile.id }
          : {}),
      },
      include: {
        client: true,
      },
    })

    if (!project) {
      throw new AppError(404, 'Project not found.', 'PROJECT_NOT_FOUND')
    }

    const activities = await db.activityEvent.findMany({
      where: {
        organizationId: context.organization!.id,
        projectId: project.id,
      },
      include: {
        actor: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    response.json({
      project: serializeProject(project),
      activity: activities.map(serializeActivity),
    })
  }),
)

projectsRouter.patch(
  '/projects/:id',
  asyncHandler(async (request, response) => {
    const context = ensureRole(request, [OrganizationRole.ADMIN, OrganizationRole.MANAGER], 'Only internal team members can update projects.')
    const payload = parseBody(projectSchema.partial(), request.body)
    const projectId = getRouteParam(request.params.id, 'id')

    const existing = await db.project.findFirst({
      where: {
        id: projectId,
        organizationId: context.organization!.id,
      },
      include: {
        client: true,
      },
    })

    if (!existing) {
      throw new AppError(404, 'Project not found.', 'PROJECT_NOT_FOUND')
    }

    if (payload.clientId) {
      const client = await db.client.findFirst({
        where: {
          id: payload.clientId,
          organizationId: context.organization!.id,
        },
      })

      if (!client) {
        throw new AppError(404, 'Client not found for this organization.', 'CLIENT_NOT_FOUND')
      }
    }

    const project = await db.project.update({
      where: { id: existing.id },
      data: {
        name: payload.name,
        description: payload.description,
        status: payload.status,
        dueDate:
          payload.dueDate === undefined ? undefined : payload.dueDate ? new Date(payload.dueDate) : null,
        clientId: payload.clientId,
        updatedById: context.user.id,
      },
      include: {
        client: true,
      },
    })

    await createActivityEvent({
      organizationId: context.organization!.id,
      actorId: context.user.id,
      subjectType: ActivitySubjectType.PROJECT,
      subjectId: project.id,
      projectId: project.id,
      clientId: project.clientId,
      message: `Updated project ${project.name}.`,
    })

    const clientMember = project.client.memberId
      ? await db.organizationMember.findUnique({
          where: { id: project.client.memberId },
          include: { user: true },
        })
      : null

    if (clientMember?.userId) {
      await createNotifications([
        {
          organizationId: context.organization!.id,
          userId: clientMember.userId,
          memberId: clientMember.id,
          type: NotificationType.PROJECT_UPDATED,
          title: notificationTypeTitles.PROJECT_UPDATED,
          message: `${project.name} was updated.`,
          link: `/projects/${project.id}`,
        },
      ])
    }

    await sendProjectUpdatedEmail({
      project,
      client: project.client,
      organization: context.organization!,
    })

    response.json({
      project: serializeProject(project),
    })
  }),
)

projectsRouter.delete(
  '/projects/:id',
  asyncHandler(async (request, response) => {
    const context = ensureRole(request, [OrganizationRole.ADMIN], 'Only admins can delete projects.')
    const projectId = getRouteParam(request.params.id, 'id')

    const existing = await db.project.findFirst({
      where: {
        id: projectId,
        organizationId: context.organization!.id,
      },
    })

    if (!existing) {
      throw new AppError(404, 'Project not found.', 'PROJECT_NOT_FOUND')
    }

    await db.project.delete({
      where: { id: existing.id },
    })

    await createActivityEvent({
      organizationId: context.organization!.id,
      actorId: context.user.id,
      subjectType: ActivitySubjectType.PROJECT,
      subjectId: existing.id,
      message: `Deleted project ${existing.name}.`,
    })

    response.status(204).send()
  }),
)
