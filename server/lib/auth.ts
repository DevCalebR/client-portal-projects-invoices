import { OrganizationRole } from '@prisma/client'
import { clerkClient, getAuth } from '@clerk/express'
import type { Request } from 'express'
import { db } from './db.js'
import { AppError } from './http.js'
import { hasMappedClerkRole, mapClerkRole, requireRole } from './rbac.js'

const buildFullName = (firstName?: string | null, lastName?: string | null, email?: string | null) => {
  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim()
  return name || email || 'Unknown user'
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildWorkspaceFallbackName = (orgId: string) => `Workspace ${orgId.slice(-6).toUpperCase()}`

const buildWorkspaceFallbackSlug = (orgId: string) => `workspace-${slugify(orgId).slice(-18)}`

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

const logAuthTrace = (event: string, meta: Record<string, unknown>) => {
  console.info('[auth.trace]', {
    event,
    ...meta,
    timestamp: new Date().toISOString(),
  })
}

export const syncRequestContext = async (
  request: Request,
  options?: { requireOrganization?: boolean; traceId?: string },
) => {
  const auth = getAuth(request)
  const traceId = options?.traceId ?? `trace_${Date.now()}`

  logAuthTrace('sync.start', {
    traceId,
    path: request.path,
    userId: auth.userId ?? null,
    orgId: auth.orgId ?? null,
    orgRole: auth.orgRole ?? null,
    requireOrganization: options?.requireOrganization ?? false,
  })

  console.log('SESSION INIT', {
    traceId,
    userId: auth.userId ?? null,
    orgId: auth.orgId ?? null,
  })

  if (!auth.userId) {
    logAuthTrace('sync.unauthorized', {
      traceId,
      path: request.path,
    })
    throw new AppError(401, 'Authentication is required.', 'UNAUTHORIZED')
  }

  try {
    const clerkUser = await clerkClient.users.getUser(auth.userId)

    const user = await db.user.upsert({
      where: { clerkUserId: clerkUser.id },
      update: {
        email: clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? '',
        firstName: clerkUser.firstName ?? undefined,
        lastName: clerkUser.lastName ?? undefined,
        fullName: buildFullName(
          clerkUser.firstName,
          clerkUser.lastName,
          clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress,
        ),
        avatarUrl: clerkUser.imageUrl ?? undefined,
      },
      create: {
        clerkUserId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? '',
        firstName: clerkUser.firstName ?? undefined,
        lastName: clerkUser.lastName ?? undefined,
        fullName: buildFullName(
          clerkUser.firstName,
          clerkUser.lastName,
          clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress,
        ),
        avatarUrl: clerkUser.imageUrl ?? undefined,
      },
    })

    request.platform = {
      auth: {
        userId: auth.userId,
        orgId: auth.orgId ?? null,
        orgRole: auth.orgRole ?? null,
      },
      user,
      organization: null,
      member: null,
      role: null,
      clientProfile: null,
    }

    logAuthTrace('sync.user_ready', {
      traceId,
      userId: auth.userId,
      orgId: auth.orgId ?? null,
      orgRole: auth.orgRole ?? null,
      userRecordId: user.id,
      email: user.email,
    })

    if (!auth.orgId) {
      if (options?.requireOrganization) {
        logAuthTrace('sync.org_required', {
          traceId,
          userId: auth.userId,
        })
        throw new AppError(403, 'Select an organization before continuing.', 'ORG_REQUIRED')
      }

      logAuthTrace('sync.no_org_selected', {
        traceId,
        userId: auth.userId,
      })
      return request.platform
    }

    let clerkOrganization:
      | Awaited<ReturnType<typeof clerkClient.organizations.getOrganization>>
      | null = null

    try {
      clerkOrganization = await clerkClient.organizations.getOrganization({
        organizationId: auth.orgId,
      })
    } catch (error) {
      logAuthTrace('sync.organization_fetch_error', {
        traceId,
        userId: auth.userId,
        orgId: auth.orgId,
        error: normalizeError(error),
      })
    }

    const existingOrganization = await db.organization.findUnique({
      where: {
        clerkOrganizationId: auth.orgId,
      },
    })

    const organizationName = clerkOrganization?.name || existingOrganization?.name || buildWorkspaceFallbackName(auth.orgId)
    const organizationSlug =
      clerkOrganization?.slug
      || existingOrganization?.slug
      || buildWorkspaceFallbackSlug(auth.orgId)

    const organization = clerkOrganization
      ? await db.organization.upsert({
          where: { clerkOrganizationId: auth.orgId },
          update: {
            name: organizationName,
            slug: organizationSlug,
            ownerUserId: existingOrganization?.ownerUserId ?? user.id,
            billingEmail: existingOrganization?.billingEmail ?? user.email,
          },
          create: {
            clerkOrganizationId: auth.orgId,
            name: organizationName,
            slug: organizationSlug,
            ownerUserId: user.id,
            billingEmail: user.email,
          },
        })
      : existingOrganization
        ? existingOrganization
        : await db.organization.create({
            data: {
              clerkOrganizationId: auth.orgId,
              name: organizationName,
              slug: organizationSlug,
              ownerUserId: user.id,
              billingEmail: user.email,
            },
          })

    request.platform = {
      ...request.platform,
      organization,
    }

    logAuthTrace('sync.organization_ready', {
      traceId,
      userId: auth.userId,
      orgId: auth.orgId,
      organizationRecordId: organization.id,
      organizationSlug: organization.slug,
      organizationSource: clerkOrganization ? 'clerk' : existingOrganization ? 'database' : 'fallback_create',
    })

    const existingMember = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
    })

    logAuthTrace('sync.membership_lookup', {
      traceId,
      userId: auth.userId,
      orgId: auth.orgId,
      existingMemberId: existingMember?.id ?? null,
      existingMemberRole: existingMember?.role ?? null,
      existingMemberStatus: existingMember?.status ?? null,
    })

    const role = hasMappedClerkRole(auth.orgRole)
      ? mapClerkRole(auth.orgRole)
      : existingMember?.role ?? (organization.ownerUserId === user.id ? OrganizationRole.ADMIN : OrganizationRole.CLIENT)

    logAuthTrace('sync.role_resolved', {
      traceId,
      userId: auth.userId,
      orgId: auth.orgId,
      clerkOrgRole: auth.orgRole ?? null,
      resolvedRole: role,
      ownerUserId: organization.ownerUserId,
    })

    const member = await db.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: user.id,
        },
      },
      update: {
        role,
        status: 'ACTIVE',
      },
      create: {
        organizationId: organization.id,
        userId: user.id,
        role,
        status: 'ACTIVE',
      },
    })

    request.platform = {
      ...request.platform,
      member,
      role,
    }

    logAuthTrace('sync.member_ready', {
      traceId,
      userId: auth.userId,
      orgId: auth.orgId,
      memberId: member.id,
      memberRole: member.role,
      memberStatus: member.status,
    })

    const clientProfile =
      role === OrganizationRole.CLIENT
        ? await db.client.upsert({
            where: {
              organizationId_email: {
                organizationId: organization.id,
                email: user.email,
              },
            },
            update: {
              memberId: member.id,
              name: user.fullName,
              email: user.email,
            },
            create: {
              organizationId: organization.id,
              memberId: member.id,
              name: user.fullName,
              email: user.email,
              billingEmail: user.email,
              portalAccessEnabled: true,
            },
          })
        : null

    request.platform = {
      ...request.platform,
      clientProfile,
    }

    logAuthTrace('sync.complete', {
      traceId,
      userId: auth.userId,
      orgId: auth.orgId,
      memberId: member.id,
      role,
      clientProfileId: clientProfile?.id ?? null,
    })

    return request.platform
  } catch (error) {
    logAuthTrace('sync.error', {
      traceId,
      path: request.path,
      userId: auth.userId ?? null,
      orgId: auth.orgId ?? null,
      orgRole: auth.orgRole ?? null,
      partialContext: request.platform
        ? {
            userId: request.platform.user.id,
            organizationId: request.platform.organization?.id ?? null,
            memberId: request.platform.member?.id ?? null,
            role: request.platform.role ?? null,
            clientProfileId: request.platform.clientProfile?.id ?? null,
          }
        : null,
      error: normalizeError(error),
    })
    throw error
  }
}

export const getRequestContext = (request: Request) => {
  if (!request.platform) {
    throw new AppError(500, 'Request context has not been initialized.', 'REQUEST_CONTEXT_MISSING')
  }

  return request.platform
}

export const ensureRequestContext = async (request: Request) => syncRequestContext(request, { requireOrganization: true })

export const ensureRole = (request: Request, allowedRoles: OrganizationRole[], message?: string) => {
  const context = getRequestContext(request)

  if (!context.role) {
    throw new AppError(403, 'Organization access is required.', 'ORG_REQUIRED')
  }

  requireRole(context.role, allowedRoles, message)
  return context
}
