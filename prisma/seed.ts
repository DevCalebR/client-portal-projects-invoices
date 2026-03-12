import {
  ActivitySubjectType,
  BillingPlan,
  InvoiceStatus,
  MembershipStatus,
  NotificationType,
  OrganizationRole,
  PaymentStatus,
  PaymentType,
  ProjectStatus,
  PrismaClient,
  SubscriptionStatus,
} from '@prisma/client'

const prisma = new PrismaClient()

const seed = async () => {
  const adminClerkUserId = process.env.DEV_SEED_ADMIN_CLERK_USER_ID ?? 'user_seed_admin'
  const managerClerkUserId = process.env.DEV_SEED_MANAGER_CLERK_USER_ID ?? 'user_seed_manager'
  const clientClerkUserId = process.env.DEV_SEED_CLIENT_CLERK_USER_ID ?? 'user_seed_client'
  const clerkOrganizationId = process.env.DEV_SEED_CLERK_ORG_ID ?? 'org_seed_acme'

  const [admin, manager, clientUser] = await Promise.all([
    prisma.user.upsert({
      where: { clerkUserId: adminClerkUserId },
      update: {
        email: 'admin@acme.test',
        firstName: 'Ava',
        lastName: 'Patel',
        fullName: 'Ava Patel',
      },
      create: {
        clerkUserId: adminClerkUserId,
        email: 'admin@acme.test',
        firstName: 'Ava',
        lastName: 'Patel',
        fullName: 'Ava Patel',
      },
    }),
    prisma.user.upsert({
      where: { clerkUserId: managerClerkUserId },
      update: {
        email: 'manager@acme.test',
        firstName: 'Kai',
        lastName: 'Rivera',
        fullName: 'Kai Rivera',
      },
      create: {
        clerkUserId: managerClerkUserId,
        email: 'manager@acme.test',
        firstName: 'Kai',
        lastName: 'Rivera',
        fullName: 'Kai Rivera',
      },
    }),
    prisma.user.upsert({
      where: { clerkUserId: clientClerkUserId },
      update: {
        email: 'client@luna.test',
        firstName: 'Maya',
        lastName: 'Johnson',
        fullName: 'Maya Johnson',
      },
      create: {
        clerkUserId: clientClerkUserId,
        email: 'client@luna.test',
        firstName: 'Maya',
        lastName: 'Johnson',
        fullName: 'Maya Johnson',
      },
    }),
  ])

  const organization = await prisma.organization.upsert({
    where: { clerkOrganizationId },
    update: {
      name: 'Acme Studio',
      slug: 'acme-studio',
      ownerUserId: admin.id,
      plan: BillingPlan.PROFESSIONAL,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      billingEmail: 'billing@acme.test',
    },
    create: {
      clerkOrganizationId,
      name: 'Acme Studio',
      slug: 'acme-studio',
      ownerUserId: admin.id,
      plan: BillingPlan.PROFESSIONAL,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      billingEmail: 'billing@acme.test',
    },
  })

  const [adminMember, managerMember, clientMember] = await Promise.all([
    prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: admin.id,
        },
      },
      update: {
        role: OrganizationRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        organizationId: organization.id,
        userId: admin.id,
        role: OrganizationRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      },
    }),
    prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: manager.id,
        },
      },
      update: {
        role: OrganizationRole.MANAGER,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        organizationId: organization.id,
        userId: manager.id,
        role: OrganizationRole.MANAGER,
        status: MembershipStatus.ACTIVE,
      },
    }),
    prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId: clientUser.id,
        },
      },
      update: {
        role: OrganizationRole.CLIENT,
        status: MembershipStatus.ACTIVE,
      },
      create: {
        organizationId: organization.id,
        userId: clientUser.id,
        role: OrganizationRole.CLIENT,
        status: MembershipStatus.ACTIVE,
      },
    }),
  ])

  const client = await prisma.client.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: clientUser.email,
      },
    },
    update: {
      memberId: clientMember.id,
      name: clientUser.fullName,
      company: 'Luna Studio',
      billingEmail: clientUser.email,
      notes: 'Primary client contact for creative retainers.',
    },
    create: {
      organizationId: organization.id,
      memberId: clientMember.id,
      name: clientUser.fullName,
      company: 'Luna Studio',
      email: clientUser.email,
      billingEmail: clientUser.email,
      notes: 'Primary client contact for creative retainers.',
    },
  })

  await prisma.notification.deleteMany({
    where: {
      organizationId: organization.id,
    },
  })

  await prisma.activityEvent.deleteMany({
    where: {
      organizationId: organization.id,
    },
  })

  await prisma.payment.deleteMany({
    where: {
      organizationId: organization.id,
    },
  })

  await prisma.invoice.deleteMany({
    where: {
      organizationId: organization.id,
    },
  })

  await prisma.project.deleteMany({
    where: {
      organizationId: organization.id,
    },
  })

  const project = await prisma.project.create({
    data: {
      organizationId: organization.id,
      clientId: client.id,
      name: 'Retention analytics dashboard',
      description: 'Build a subscription retention analytics dashboard for the client portal.',
      status: ProjectStatus.IN_PROGRESS,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      createdById: admin.id,
      updatedById: manager.id,
    },
  })

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: organization.id,
      clientId: client.id,
      projectId: project.id,
      invoiceNumber: 1001,
      status: InvoiceStatus.OPEN,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      subtotal: '1400.00',
      total: '1400.00',
      balanceDue: '1400.00',
      amountPaid: '0.00',
      currency: 'USD',
      notes: 'Initial milestone invoice for the analytics dashboard.',
      createdById: admin.id,
      updatedById: admin.id,
      items: {
        create: [
          {
            organizationId: organization.id,
            description: 'Dashboard implementation milestone',
            quantity: 8,
            unitPrice: '175.00',
            total: '1400.00',
            sortOrder: 0,
          },
        ],
      },
    },
  })

  await prisma.payment.create({
    data: {
      organizationId: organization.id,
      invoiceId: invoice.id,
      type: PaymentType.INVOICE,
      status: PaymentStatus.PENDING,
      amount: '1400.00',
      currency: 'USD',
    },
  })

  await prisma.activityEvent.createMany({
    data: [
      {
        organizationId: organization.id,
        actorId: admin.id,
        subjectType: ActivitySubjectType.PROJECT,
        subjectId: project.id,
        projectId: project.id,
        clientId: client.id,
        message: 'Created the retention analytics dashboard project.',
      },
      {
        organizationId: organization.id,
        actorId: admin.id,
        subjectType: ActivitySubjectType.INVOICE,
        subjectId: invoice.id,
        invoiceId: invoice.id,
        clientId: client.id,
        message: 'Created invoice #1001 for the dashboard milestone.',
      },
    ],
  })

  await prisma.notification.createMany({
    data: [
      {
        organizationId: organization.id,
        userId: clientUser.id,
        memberId: clientMember.id,
        type: NotificationType.INVOICE_CREATED,
        title: 'New invoice available',
        message: 'Invoice #1001 is ready for review and payment.',
        link: `/invoices/${invoice.id}`,
      },
      {
        organizationId: organization.id,
        userId: manager.id,
        memberId: managerMember.id,
        type: NotificationType.PROJECT_UPDATED,
        title: 'Project status changed',
        message: 'Retention analytics dashboard is now in progress.',
        link: `/projects/${project.id}`,
      },
    ],
  })

  console.info('Database seeded with starter SaaS data.')
  console.info({
    organizationId: organization.id,
    adminMemberId: adminMember.id,
    managerMemberId: managerMember.id,
    clientMemberId: clientMember.id,
  })
}

void seed()
  .catch((error) => {
    console.error('Failed to seed database.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
