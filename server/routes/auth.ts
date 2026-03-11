import { OrganizationRole } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { clerkClient } from '@clerk/express'
import { serverEnv } from '../config/env'
import { ensureRequestContext, ensureRole, syncRequestContext } from '../lib/auth'
import { asyncHandler, parseBody } from '../lib/http'
import { createNotifications, notificationTypeTitles } from '../lib/notifications'
import { serializeClient, serializeMembership, serializeOrganization, serializeUser } from '../lib/serializers'
import { sendTeamInvitationEmail } from '../lib/email'
import { db } from '../lib/db'

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'CLIENT']),
})

export const authRouter = Router()

authRouter.get(
  '/auth/session',
  asyncHandler(async (request, response) => {
    const context = await syncRequestContext(request)

    if (!context.organization || !context.member || !context.role) {
      return response.json({
        user: serializeUser(context.user),
        organization: null,
        membership: null,
        clientProfile: null,
        members: [],
        invitations: [],
      })
    }

    const [members, invitations] = await Promise.all([
      db.organizationMember.findMany({
        where: {
          organizationId: context.organization.id,
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      clerkClient.organizations.getOrganizationInvitationList({
        organizationId: context.auth.orgId!,
      }),
    ])

    return response.json({
      user: serializeUser(context.user),
      organization: serializeOrganization(context.organization),
      membership: serializeMembership(context.member),
      clientProfile: context.clientProfile ? serializeClient(context.clientProfile) : null,
      members: members.map((entry) => ({
        id: entry.id,
        role: entry.role,
        status: entry.status,
        user: serializeUser(entry.user),
      })),
      invitations: invitations.data.map((entry) => ({
        id: entry.id,
        emailAddress: entry.emailAddress,
        role: entry.role,
        status: entry.status,
        createdAt: entry.createdAt,
      })),
    })
  }),
)

authRouter.post('/auth/login', (_request, response) => {
  response.json({
    redirectUrl: serverEnv.clerkSignInUrl,
  })
})

authRouter.post('/auth/logout', (_request, response) => {
  response.json({
    redirectUrl: serverEnv.clerkSignInUrl,
  })
})

authRouter.post(
  '/organizations/invitations',
  asyncHandler(async (request, response) => {
    await ensureRequestContext(request)
    const context = ensureRole(request, [OrganizationRole.ADMIN], 'Only admins can invite team members.')
    const payload = parseBody(inviteSchema, request.body)
    const clerkRole = `org:${payload.role.toLowerCase()}` as 'org:admin' | 'org:manager' | 'org:client'

    const invitation = await clerkClient.organizations.createOrganizationInvitation({
      organizationId: context.auth.orgId!,
      emailAddress: payload.email,
      inviterUserId: context.auth.userId,
      role: clerkRole,
      redirectUrl: serverEnv.clerkInvitationRedirectUrl,
    })

    await createNotifications([
      {
        organizationId: context.organization!.id,
        userId: context.user.id,
        memberId: context.member!.id,
        type: 'TEAM_INVITE',
        title: notificationTypeTitles.TEAM_INVITE,
        message: `Invitation sent to ${payload.email} as ${payload.role.toLowerCase()}.`,
        link: '/settings',
      },
    ])

    await sendTeamInvitationEmail({
      email: payload.email,
      inviter: context.user,
      organization: context.organization!,
      role: payload.role,
    })

    return response.status(201).json({
      invitation: {
        id: invitation.id,
        emailAddress: invitation.emailAddress,
        role: invitation.role,
        status: invitation.status,
      },
    })
  }),
)
