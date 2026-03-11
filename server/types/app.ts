import type { Client, Organization, OrganizationMember, OrganizationRole, User } from '@prisma/client'

export interface RequestContext {
  auth: {
    userId: string
    orgId: string | null
    orgRole: string | null
  }
  user: User
  organization: Organization | null
  member: OrganizationMember | null
  role: OrganizationRole | null
  clientProfile: Client | null
}

