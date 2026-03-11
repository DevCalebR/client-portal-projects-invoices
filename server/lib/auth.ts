import { OrganizationRole } from '@prisma/client'
import { clerkClient, getAuth } from '@clerk/express'
import type { Request } from 'express'
import { db } from './db'
import { AppError } from './http'
import { mapClerkRole, requireRole } from './rbac'

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

export const syncRequestContext = async (request: Request, options?: { requireOrganization?: boolean }) => {
  const auth = getAuth(request)

  if (!auth.userId) {
    throw new AppError(401, 'Authentication is required.', 'UNAUTHORIZED')
  }

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

  if (!auth.orgId) {
    if (options?.requireOrganization) {
      throw new AppError(403, 'Select an organization before continuing.', 'ORG_REQUIRED')
    }

    request.platform = {
      auth: {
        userId: auth.userId,
        orgId: null,
        orgRole: auth.orgRole ?? null,
      },
      user,
      organization: null,
      member: null,
      role: null,
      clientProfile: null,
    }

    return request.platform
  }

  const clerkOrganization = await clerkClient.organizations.getOrganization({
    organizationId: auth.orgId,
  })
  const role = mapClerkRole(auth.orgRole)

  const organization = await db.organization.upsert({
    where: { clerkOrganizationId: clerkOrganization.id },
    update: {
      name: clerkOrganization.name,
      slug: clerkOrganization.slug || slugify(clerkOrganization.name),
      ownerUserId: user.id,
    },
    create: {
      clerkOrganizationId: clerkOrganization.id,
      name: clerkOrganization.name,
      slug: clerkOrganization.slug || slugify(clerkOrganization.name),
      ownerUserId: user.id,
      billingEmail: user.email,
    },
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
    auth: {
      userId: auth.userId,
      orgId: auth.orgId,
      orgRole: auth.orgRole ?? null,
    },
    user,
    organization,
    member,
    role,
    clientProfile,
  }

  return request.platform
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

