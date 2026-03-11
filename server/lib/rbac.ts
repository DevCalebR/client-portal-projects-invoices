import { OrganizationRole } from '@prisma/client'
import { AppError } from './http'

export const INTERNAL_ROLES: OrganizationRole[] = [
  OrganizationRole.ADMIN,
  OrganizationRole.MANAGER,
]

export const mapClerkRole = (role: string | null | undefined): OrganizationRole => {
  switch (role) {
    case 'org:admin':
      return OrganizationRole.ADMIN
    case 'org:manager':
      return OrganizationRole.MANAGER
    case 'org:client':
      return OrganizationRole.CLIENT
    default:
      return OrganizationRole.CLIENT
  }
}

export const requireRole = (
  role: OrganizationRole,
  allowedRoles: OrganizationRole[],
  message = 'You do not have permission to perform this action.',
) => {
  if (!allowedRoles.includes(role)) {
    throw new AppError(403, message, 'FORBIDDEN')
  }
}

export const isInternalRole = (role: OrganizationRole) => INTERNAL_ROLES.includes(role)

export const isBillingRole = (role: OrganizationRole) => role === OrganizationRole.ADMIN

