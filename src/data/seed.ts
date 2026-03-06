import type { Invoice, Project, User } from '../types/entities'

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
    password: 'admin123',
  },
  {
    id: 'user-client-001',
    name: 'Maya Johnson',
    email: 'client@example.com',
    role: 'client',
    company: 'Luna Studio',
    password: 'client123',
  },
  {
    id: 'user-client-002',
    name: 'Noah Rivera',
    email: 'noah@lakeside.co',
    role: 'client',
    company: 'Lakeside Interiors',
    password: 'client456',
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

export const getSeedData = () => ({
  users: seededUsers,
  projects: seededProjects,
  invoices: seedInvoicesWithTotals,
})
