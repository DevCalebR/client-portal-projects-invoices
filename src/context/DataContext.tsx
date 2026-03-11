/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { activitySchema, invoiceSchema, projectSchema } from '../data/schemas'
import { getSeedData } from '../data/seed'
import { calculateInvoiceSubtotal, makeId, toIsoDate } from '../utils/format'
import { loadArray, saveArray, STORAGE_KEYS } from '../data/storage'
import type {
  ActivityEntry,
  Invoice,
  InvoiceInput,
  InvoiceLineItem,
  Project,
  ProjectInput,
} from '../types/entities'
import { isAdminUser } from '../types/entities'
import { useAuth } from './AuthContext'
import { useFeedback } from './FeedbackContext'
import { logAppError } from '../utils/logger'

interface DataContextType {
  projects: Project[]
  invoices: Invoice[]
  activities: ActivityEntry[]
  isLoading: boolean
  createProject: (input: ProjectInput) => Project
  updateProject: (id: string, input: ProjectInput) => Project
  deleteProject: (id: string) => void
  createInvoice: (input: InvoiceInput) => Invoice
  updateInvoice: (id: string, input: InvoiceInput) => Invoice
  deleteInvoice: (id: string) => void
  getProject: (id: string) => Project | undefined
  getInvoice: (id: string) => Invoice | undefined
  resetDemoData: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}

const sortByUpdated = <T extends { updatedAt: string }>(records: T[]): T[] =>
  [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

const sortByTimestamp = <T extends { timestamp: string }>(records: T[]): T[] =>
  [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

const seed = getSeedData()

const normalizeLineItemInput = (
  item: { id?: string; description: string; quantity: number; rate: number },
): InvoiceLineItem => ({
  ...item,
  id: item.id ?? makeId(),
})

const normalizeInvoiceStatus = (invoice: Invoice): Invoice => {
  const dueDateMs = Date.parse(invoice.dueDate)

  if (!Number.isNaN(dueDateMs) && dueDateMs < Date.now() && invoice.status === 'unpaid') {
    return {
      ...invoice,
      status: 'overdue',
    }
  }

  return invoice
}

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user, users } = useAuth()
  const { notify } = useFeedback()
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [activities, setActivities] = useState<ActivityEntry[]>([])

  const ensureAdmin = useCallback(() => {
    if (!isAdminUser(user)) {
      throw new Error('Admin access is required to change project or invoice data.')
    }
  }, [user])

  const getClientRecord = useCallback(
    (clientId: string) => {
      const client = users.find((person) => person.id === clientId && person.role === 'client')

      if (!client) {
        throw new Error('Select a valid client account before saving.')
      }

      return client
    },
    [users],
  )

  const appendActivity = useCallback(
    ({
      action,
      subjectType,
      subjectId,
      subjectName,
      description,
    }: Omit<ActivityEntry, 'id' | 'timestamp' | 'actorId' | 'actorName'>) => {
      const activity: ActivityEntry = {
        id: makeId(),
        actorId: user?.id ?? 'system',
        actorName: user?.name ?? 'System',
        action,
        subjectType,
        subjectId,
        subjectName,
        description,
        timestamp: new Date().toISOString(),
      }

      setActivities((current) => sortByTimestamp([activity, ...current]))
    },
    [user],
  )

  useEffect(() => {
    const boot = () => {
      const persistedProjects = loadArray<Project>(
        STORAGE_KEYS.projects,
        seed.projects,
        projectSchema,
      )
      const persistedInvoices = loadArray<Invoice>(
        STORAGE_KEYS.invoices,
        seed.invoices,
        invoiceSchema,
      ).map(normalizeInvoiceStatus)
      const persistedActivities = loadArray<ActivityEntry>(
        STORAGE_KEYS.activity,
        seed.activities,
        activitySchema,
      )

      setProjects(sortByUpdated(persistedProjects))
      setInvoices(sortByUpdated(persistedInvoices))
      setActivities(sortByTimestamp(persistedActivities))
      setIsLoading(false)
    }

    const timer = window.setTimeout(boot, 160)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!saveArray(STORAGE_KEYS.projects, projects)) {
      logAppError(new Error('Failed to persist projects.'), {
        scope: 'DataProvider',
        storageKey: STORAGE_KEYS.projects,
      })
      notify({
        title: 'Projects were not saved',
        message: 'Browser storage rejected the latest project update.',
        tone: 'error',
      })
    }
  }, [projects, isLoading, notify])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!saveArray(STORAGE_KEYS.invoices, invoices)) {
      logAppError(new Error('Failed to persist invoices.'), {
        scope: 'DataProvider',
        storageKey: STORAGE_KEYS.invoices,
      })
      notify({
        title: 'Invoices were not saved',
        message: 'Browser storage rejected the latest invoice update.',
        tone: 'error',
      })
    }
  }, [invoices, isLoading, notify])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!saveArray(STORAGE_KEYS.activity, activities)) {
      logAppError(new Error('Failed to persist activity log.'), {
        scope: 'DataProvider',
        storageKey: STORAGE_KEYS.activity,
      })
    }
  }, [activities, isLoading])

  const createProject = useCallback((input: ProjectInput): Project => {
    ensureAdmin()
    const client = getClientRecord(input.clientId)
    const now = new Date().toISOString()
    const project: Project = {
      id: makeId(),
      name: input.name,
      clientId: input.clientId,
      status: input.status,
      dueDate: input.dueDate || undefined,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    }

    setProjects((prevProjects) => sortByUpdated([project, ...prevProjects]))
    appendActivity({
      action: 'created',
      subjectType: 'project',
      subjectId: project.id,
      subjectName: project.name,
      description: `Created a new project for ${client.name}.`,
    })

    return project
  }, [appendActivity, ensureAdmin, getClientRecord])

  const updateProject = useCallback((id: string, input: ProjectInput): Project => {
    ensureAdmin()

    const existingProject = projects.find((project) => project.id === id)

    if (!existingProject) {
      throw new Error('The project you tried to update no longer exists.')
    }

    const client = getClientRecord(input.clientId)
    const updatedProject: Project = {
      ...existingProject,
      name: input.name,
      clientId: input.clientId,
      status: input.status,
      dueDate: input.dueDate || undefined,
      notes: input.notes,
      updatedAt: new Date().toISOString(),
    }

    setProjects((prevProjects) =>
      sortByUpdated(
        prevProjects.map((existing) => (existing.id === id ? updatedProject : existing)),
      ),
    )

    appendActivity({
      action: 'updated',
      subjectType: 'project',
      subjectId: updatedProject.id,
      subjectName: updatedProject.name,
      description: `Updated the project assignment or status for ${client.name}.`,
    })

    return updatedProject
  }, [appendActivity, ensureAdmin, getClientRecord, projects])

  const deleteProject = useCallback((id: string) => {
    ensureAdmin()

    const existingProject = projects.find((project) => project.id === id)

    if (!existingProject) {
      throw new Error('The project you tried to delete no longer exists.')
    }

    const relatedInvoiceCount = invoices.filter((invoice) => invoice.projectId === id).length

    setProjects((prevProjects) => prevProjects.filter((project) => project.id !== id))
    setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.projectId !== id))
    appendActivity({
      action: 'deleted',
      subjectType: 'project',
      subjectId: existingProject.id,
      subjectName: existingProject.name,
      description:
        relatedInvoiceCount > 0
          ? `Deleted the project and removed ${relatedInvoiceCount} linked invoice(s).`
          : 'Deleted the project.',
    })
  }, [appendActivity, ensureAdmin, invoices, projects])

  const createInvoice = useCallback((input: InvoiceInput): Invoice => {
    ensureAdmin()
    const project = projects.find((entry) => entry.id === input.projectId)

    if (!project) {
      throw new Error('Choose a valid project before creating an invoice.')
    }

    const client = getClientRecord(project.clientId)
    const now = new Date().toISOString()
    const lineItems = input.lineItems.map((lineItem) =>
      normalizeLineItemInput({
        ...lineItem,
        id: makeId(),
      }),
    )
    const subtotal = calculateInvoiceSubtotal(lineItems)
    const invoice = normalizeInvoiceStatus({
      id: makeId(),
      projectId: input.projectId,
      clientId: project.clientId,
      status: input.status,
      lineItems,
      subtotal,
      total: subtotal,
      issueDate: toIsoDate(input.issueDate),
      dueDate: toIsoDate(input.dueDate),
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    })

    setInvoices((prevInvoices) => sortByUpdated([invoice, ...prevInvoices]))
    appendActivity({
      action: 'created',
      subjectType: 'invoice',
      subjectId: invoice.id,
      subjectName: `Invoice ${invoice.id}`,
      description: `Created an invoice for ${client.name}.`,
    })

    return invoice
  }, [appendActivity, ensureAdmin, getClientRecord, projects])

  const updateInvoice = useCallback((id: string, input: InvoiceInput): Invoice => {
    ensureAdmin()
    const existingInvoice = invoices.find((invoice) => invoice.id === id)

    if (!existingInvoice) {
      throw new Error('The invoice you tried to update no longer exists.')
    }

    const project = projects.find((entry) => entry.id === input.projectId)

    if (!project) {
      throw new Error('Choose a valid project before saving the invoice.')
    }

    const client = getClientRecord(project.clientId)
    const lineItems = input.lineItems.map((lineItem) =>
      normalizeLineItemInput({
        ...lineItem,
        id: lineItem.id,
      }),
    )
    const subtotal = calculateInvoiceSubtotal(lineItems)

    const updatedInvoice = normalizeInvoiceStatus({
      ...existingInvoice,
      projectId: input.projectId,
      clientId: project.clientId,
      status: input.status,
      lineItems,
      subtotal,
      total: subtotal,
      issueDate: toIsoDate(input.issueDate),
      dueDate: toIsoDate(input.dueDate),
      notes: input.notes,
      updatedAt: new Date().toISOString(),
    })

    setInvoices((prevInvoices) =>
      sortByUpdated(prevInvoices.map((existing) => (existing.id === id ? updatedInvoice : existing))),
    )

    appendActivity({
      action: 'updated',
      subjectType: 'invoice',
      subjectId: updatedInvoice.id,
      subjectName: `Invoice ${updatedInvoice.id}`,
      description: `Updated the invoice details for ${client.name}.`,
    })

    return updatedInvoice
  }, [appendActivity, ensureAdmin, getClientRecord, invoices, projects])

  const deleteInvoice = useCallback((id: string) => {
    ensureAdmin()

    const existingInvoice = invoices.find((invoice) => invoice.id === id)

    if (!existingInvoice) {
      throw new Error('The invoice you tried to delete no longer exists.')
    }

    setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.id !== id))
    appendActivity({
      action: 'deleted',
      subjectType: 'invoice',
      subjectId: existingInvoice.id,
      subjectName: `Invoice ${existingInvoice.id}`,
      description: 'Deleted the invoice.',
    })
  }, [appendActivity, ensureAdmin, invoices])

  const getProject = useCallback(
    (id: string): Project | undefined =>
      projects.find((project) => project.id === id),
    [projects],
  )

  const getInvoice = useCallback(
    (id: string): Invoice | undefined =>
      invoices.find((invoice) => invoice.id === id),
    [invoices],
  )

  const resetDemoData = useCallback(() => {
    ensureAdmin()
    setProjects(sortByUpdated(seed.projects))
    setInvoices(sortByUpdated(seed.invoices.map(normalizeInvoiceStatus)))
    setActivities(sortByTimestamp(seed.activities))
    appendActivity({
      action: 'restored',
      subjectType: 'system',
      subjectId: 'seed-data',
      subjectName: 'Seed data',
      description: 'Restored the seeded demo dataset.',
    })
  }, [appendActivity, ensureAdmin])

  const value = useMemo(
    () => ({
      projects,
      invoices,
      activities,
      isLoading,
      createProject,
      updateProject,
      deleteProject,
      createInvoice,
      updateInvoice,
      deleteInvoice,
      getProject,
      getInvoice,
      resetDemoData,
    }),
    [
      projects,
      invoices,
      activities,
      isLoading,
      createProject,
      updateProject,
      deleteProject,
      createInvoice,
      updateInvoice,
      deleteInvoice,
      getProject,
      getInvoice,
      resetDemoData,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
