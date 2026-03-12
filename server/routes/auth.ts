import { OrganizationRole } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { clerkClient, getAuth } from '@clerk/express'
import { serverEnv } from '../config/env.js'
import { ensureRequestContext, ensureRole, syncRequestContext } from '../lib/auth.js'
import { AppError, asyncHandler, getErrorResponse, parseBody } from '../lib/http.js'
import { createNotifications, notificationTypeTitles } from '../lib/notifications.js'
import { serializeClient, serializeMembership, serializeOrganization, serializeUser } from '../lib/serializers.js'
import { sendTeamInvitationEmail } from '../lib/email.js'
import { db } from '../lib/db.js'

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'CLIENT']),
})

export const authRouter = Router()

const createSessionPayload = () => ({
  user: null as ReturnType<typeof serializeUser> | null,
  organization: null as ReturnType<typeof serializeOrganization> | null,
  membership: null as ReturnType<typeof serializeMembership> | null,
  clientProfile: null as ReturnType<typeof serializeClient> | null,
  members: [] as Array<{
    id: string
    role: string
    status: string
    user: ReturnType<typeof serializeUser>
  }>,
  invitations: [] as Array<{
    id: string
    emailAddress: string
    role: string
    status: string
    createdAt: number
  }>,
  meta: {
    ready: true,
    source: 'complete' as 'complete' | 'partial',
    authUserId: null as string | null,
    authOrgId: null as string | null,
    authOrgRole: null as string | null,
    requestedOrgId: null as string | null,
    error: null as string | null,
    errorCode: null as string | null,
    syncedAt: new Date().toISOString(),
  },
})

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown error',
  }
}

authRouter.get(
  '/auth/session',
  asyncHandler(async (request, response) => {
    const traceId = randomUUID()
    const auth = getAuth(request)
    const sessionPayload = createSessionPayload()

    sessionPayload.meta = {
      ...sessionPayload.meta,
      authUserId: auth.userId ?? null,
      authOrgId: auth.orgId ?? null,
      authOrgRole: auth.orgRole ?? null,
      requestedOrgId: auth.orgId ?? null,
    }

    console.info('[auth.session]', {
      traceId,
      event: 'start',
      userId: auth.userId ?? null,
      orgId: auth.orgId ?? null,
      orgRole: auth.orgRole ?? null,
      path: request.path,
      timestamp: new Date().toISOString(),
    })

    try {
      const context = await syncRequestContext(request, { traceId })

      sessionPayload.user = serializeUser(context.user)
      sessionPayload.meta = {
        ...sessionPayload.meta,
        authUserId: context.auth.userId,
        authOrgId: context.auth.orgId,
        authOrgRole: context.auth.orgRole,
      }

      console.info('[auth.session]', {
        traceId,
        event: 'context_ready',
        userId: context.auth.userId,
        orgId: context.auth.orgId,
        orgRole: context.auth.orgRole,
        membershipId: context.member?.id ?? null,
        membershipRole: context.member?.role ?? null,
        organizationId: context.organization?.id ?? null,
        organizationSlug: context.organization?.slug ?? null,
        timestamp: new Date().toISOString(),
      })

      if (!context.organization || !context.member || !context.role) {
        return response.json(sessionPayload)
      }

      const membersPromise = db.organizationMember.findMany({
        where: {
          organizationId: context.organization.id,
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      })

      const invitationsPromise =
        context.role === OrganizationRole.ADMIN
          ? clerkClient.organizations
              .getOrganizationInvitationList({
                organizationId: context.auth.orgId!,
              })
              .then((result) => {
                console.info('[auth.session]', {
                  traceId,
                  event: 'invitation_fetch_success',
                  userId: context.auth.userId,
                  orgId: context.auth.orgId,
                  invitationCount: result.data.length,
                  timestamp: new Date().toISOString(),
                })
                return result
              })
              .catch((error) => {
                console.warn('[auth.session] Unable to fetch organization invitations.', {
                  traceId,
                  event: 'invitation_fetch_error',
                  orgId: context.auth.orgId,
                  userId: context.auth.userId,
                  error: normalizeError(error),
                  timestamp: new Date().toISOString(),
                })

                return { data: [] }
              })
          : Promise.resolve({ data: [] })

      const [members, invitations] = await Promise.all([membersPromise, invitationsPromise])

      console.info('[auth.session]', {
        traceId,
        event: 'membership_lookup',
        userId: context.auth.userId,
        orgId: context.auth.orgId,
        membershipId: context.member.id,
        membershipRole: context.member.role,
        memberCount: members.length,
        invitationCount: invitations.data.length,
        timestamp: new Date().toISOString(),
      })

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
        meta: {
          ready: true,
          source: 'complete' as const,
          authUserId: context.auth.userId,
          authOrgId: context.auth.orgId,
          authOrgRole: context.auth.orgRole,
          requestedOrgId: context.auth.orgId,
          error: null,
          errorCode: null,
          syncedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      const errorResponse = getErrorResponse(error)
      const partialContext = request.platform

      if (partialContext?.user) {
        sessionPayload.user = serializeUser(partialContext.user)
      }

      if (partialContext?.organization) {
        sessionPayload.organization = serializeOrganization(partialContext.organization)
      }

      if (partialContext?.member) {
        sessionPayload.membership = serializeMembership(partialContext.member)
      }

      if (partialContext?.clientProfile) {
        sessionPayload.clientProfile = serializeClient(partialContext.clientProfile)
      }

      sessionPayload.meta = {
        ...sessionPayload.meta,
        ready: false,
        source: 'partial',
        error: errorResponse.payload.message,
        errorCode: errorResponse.payload.error,
        syncedAt: new Date().toISOString(),
      }

      console.error('[auth.session]', {
        traceId,
        event: 'error',
        userId: sessionPayload.meta.authUserId,
        orgId: sessionPayload.meta.authOrgId,
        orgRole: sessionPayload.meta.authOrgRole,
        partialContext: partialContext
          ? {
              userId: partialContext.user.id,
              organizationId: partialContext.organization?.id ?? null,
              membershipId: partialContext.member?.id ?? null,
              membershipRole: partialContext.member?.role ?? null,
            }
          : null,
        error: normalizeError(error),
        statusCode: error instanceof AppError ? error.statusCode : errorResponse.statusCode,
        timestamp: new Date().toISOString(),
      })

      return response.json(sessionPayload)
    }
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
