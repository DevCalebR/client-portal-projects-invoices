import type { ActivityEntry, Invoice, Project, User } from '../types/entities'

const today = new Date()

const addDays = (days: number): string => {
  const date = new Date(today)
  date.setDate(today.getDate() + days)
  return date.toISOString()
}

const makeLineItems = (projectName: string): Invoice['lineItems'] => [
  {
    id: `line-${projectName.toLowerCase().replace(/\s+/g, '-')}-1`,
    description: `${projectName} research and discovery`,
    quantity: 12,
    rate: 95,
  },
  {
    id: `line-${projectName.toLowerCase().replace(/\s+/g, '-')}-2`,
    description: `${projectName} implementation`,
    quantity: 8,
    rate: 150,
  },
]

export const seededUsers: User[] = [
  {
    id: 'user-admin-001',
    name: 'Ava Patel',
    email: 'admin@example.com',
    role: 'admin',
    company: 'Freelance HQ',
    passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  },
  {
    id: 'user-client-001',
    name: 'Maya Johnson',
    email: 'client@example.com',
    role: 'client',
    company: 'Luna Studio',
    passwordHash: '186474c1f2c2f735a54c2cf82ee8e87f2a5cd30940e280029363fecedfc5328c',
  },
  {
    id: 'user-client-002',
    name: 'Noah Rivera',
    email: 'noah@lakeside.co',
    role: 'client',
    company: 'Lakeside Interiors',
    passwordHash: 'e56b37a242a602bed629c6087c648f8ac1f1772dc3d51b90bc23fc71aea72f34',
  },
]

export const seededProjects: Project[] = [
  {
    id: 'project-001',
    name: 'Brand refresh for Luna Studio',
    clientId: 'user-client-001',
    status: 'in_progress',
    dueDate: addDays(17),
    notes:
      'Visual identity updates include landing page hero, social kit, and email announcement.',
    createdAt: addDays(-18),
    updatedAt: addDays(-2),
  },
  {
    id: 'project-002',
    name: 'Marketing dashboard implementation',
    clientId: 'user-client-002',
    status: 'review',
    dueDate: addDays(25),
    notes: 'Client requested a review-first rollout with two rounds of revisions.',
    createdAt: addDays(-35),
    updatedAt: addDays(-6),
  },
  {
    id: 'project-003',
    name: 'Product launch landing copy + design',
    clientId: 'user-client-001',
    status: 'planning',
    notes: 'Kickoff completed, awaiting visual comps.',
    createdAt: addDays(-14),
    updatedAt: addDays(-11),
  },
  {
    id: 'project-004',
    name: 'Conference sponsor microsite',
    clientId: 'user-client-002',
    status: 'completed',
    dueDate: addDays(-4),
    notes: 'Delivered on time with minor post-launch tweaks.',
    createdAt: addDays(-22),
    updatedAt: addDays(-4),
  },
]

const seededInvoices: Invoice[] = [
  {
    id: 'invoice-001',
    projectId: 'project-001',
    clientId: 'user-client-001',
    status: 'unpaid',
    lineItems: makeLineItems('Brand refresh'),
    subtotal: 0,
    total: 0,
    issueDate: addDays(-10),
    dueDate: addDays(10),
    notes: 'Phase 1 milestone invoice.',
    createdAt: addDays(-10),
    updatedAt: addDays(-10),
  },
  {
    id: 'invoice-002',
    projectId: 'project-002',
    clientId: 'user-client-002',
    status: 'draft',
    lineItems: makeLineItems('Marketing dashboard'),
    subtotal: 0,
    total: 0,
    issueDate: addDays(-3),
    dueDate: addDays(14),
    notes: 'Draft pending client kickoff.',
    createdAt: addDays(-3),
    updatedAt: addDays(-1),
  },
  {
    id: 'invoice-003',
    projectId: 'project-004',
    clientId: 'user-client-002',
    status: 'paid',
    lineItems: [
      {
        id: 'line-conf-1',
        description: 'Microsite build',
        quantity: 14,
        rate: 155,
      },
    ],
    subtotal: 0,
    total: 0,
    issueDate: addDays(-6),
    dueDate: addDays(-2),
    notes: 'Final invoice for completed project.',
    createdAt: addDays(-6),
    updatedAt: addDays(-2),
  },
]

const recalc = (invoice: Invoice): Invoice => {
  const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0)

  const total = Math.round(subtotal * 100) / 100

  return {
    ...invoice,
    subtotal: total,
    total,
  }
}

const seedInvoicesWithTotals = seededInvoices.map(recalc)

const seededActivities: ActivityEntry[] = [
  {
    id: 'activity-001',
    actorId: 'user-admin-001',
    actorName: 'Ava Patel',
    action: 'updated',
    subjectType: 'project',
    subjectId: 'project-001',
    subjectName: 'Brand refresh for Luna Studio',
    description: 'Updated the delivery plan and moved the project into active execution.',
    timestamp: addDays(-2),
  },
  {
    id: 'activity-002',
    actorId: 'user-admin-001',
    actorName: 'Ava Patel',
    action: 'created',
    subjectType: 'invoice',
    subjectId: 'invoice-002',
    subjectName: 'Invoice invoice-002',
    description: 'Created a kickoff invoice for the marketing dashboard implementation.',
    timestamp: addDays(-1),
  },
  {
    id: 'activity-003',
    actorId: 'user-admin-001',
    actorName: 'Ava Patel',
    action: 'updated',
    subjectType: 'invoice',
    subjectId: 'invoice-003',
    subjectName: 'Invoice invoice-003',
    description: 'Marked the conference sponsor microsite invoice as paid.',
    timestamp: addDays(-2),
  },
]

export const getSeedData = () => ({
  users: seededUsers,
  projects: seededProjects,
  invoices: seedInvoicesWithTotals,
  activities: seededActivities,
})
