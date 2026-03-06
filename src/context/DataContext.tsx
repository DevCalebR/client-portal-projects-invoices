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
import { getSeedData } from '../data/seed'
import { calculateInvoiceSubtotal, makeId, toIsoDate } from '../utils/format'
import { loadArray, saveArray, STORAGE_KEYS } from '../data/storage'
import type {
  Invoice,
  InvoiceInput,
  InvoiceLineItem,
  Project,
  ProjectInput,
} from '../types/entities'

interface DataContextType {
  projects: Project[]
  invoices: Invoice[]
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

const seed = getSeedData()

const normalizeLineItemInput = (
  item: { id?: string; description: string; quantity: number; rate: number },
): InvoiceLineItem => ({
  ...item,
  id: item.id ?? makeId(),
})

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    const boot = () => {
      const persistedProjects = loadArray<Project>(STORAGE_KEYS.projects, seed.projects)
      const persistedInvoices = loadArray<Invoice>(STORAGE_KEYS.invoices, seed.invoices)

      setProjects(sortByUpdated(persistedProjects))
      setInvoices(sortByUpdated(persistedInvoices))
      setIsLoading(false)
    }

    const timer = window.setTimeout(boot, 160)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      saveArray(STORAGE_KEYS.projects, projects)
    }
  }, [projects, isLoading])

  useEffect(() => {
    if (!isLoading) {
      saveArray(STORAGE_KEYS.invoices, invoices)
    }
  }, [invoices, isLoading])

  const createProject = useCallback((input: ProjectInput): Project => {
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
    return project
  }, [])

  const updateProject = useCallback((id: string, input: ProjectInput): Project => {
    let updatedProject: Project = {
      id,
      name: input.name,
      clientId: input.clientId,
      status: input.status,
      dueDate: input.dueDate || undefined,
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setProjects((prevProjects) => {
      const updated = prevProjects.map((existing) => {
        if (existing.id !== id) {
          return existing
        }

        updatedProject = {
          ...existing,
          ...updatedProject,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        }

        return updatedProject
      })

      return sortByUpdated(updated)
    })

    return updatedProject
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects((prevProjects) => prevProjects.filter((project) => project.id !== id))
    setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.projectId !== id))
  }, [])

  const createInvoice = useCallback((input: InvoiceInput): Invoice => {
    const now = new Date().toISOString()
    const lineItems = input.lineItems.map((lineItem) =>
      normalizeLineItemInput({
        ...lineItem,
        id: makeId(),
      }),
    )
    const subtotal = calculateInvoiceSubtotal(lineItems)
    const invoice: Invoice = {
      id: makeId(),
      projectId: input.projectId,
      clientId: input.clientId,
      status: input.status,
      lineItems,
      subtotal,
      total: subtotal,
      issueDate: toIsoDate(input.issueDate),
      dueDate: toIsoDate(input.dueDate),
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    }

    setInvoices((prevInvoices) => sortByUpdated([invoice, ...prevInvoices]))
    return invoice
  }, [])

  const updateInvoice = useCallback((id: string, input: InvoiceInput): Invoice => {
    const lineItems = input.lineItems.map((lineItem) =>
      normalizeLineItemInput({
        ...lineItem,
        id: lineItem.id,
      }),
    )
    const subtotal = calculateInvoiceSubtotal(lineItems)

    let updatedInvoice: Invoice = {
      id,
      projectId: input.projectId,
      clientId: input.clientId,
      status: input.status,
      lineItems,
      subtotal,
      total: subtotal,
      issueDate: toIsoDate(input.issueDate),
      dueDate: toIsoDate(input.dueDate),
      notes: input.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setInvoices((prevInvoices) => {
      const updated = prevInvoices.map((existing) => {
        if (existing.id !== id) {
          return existing
        }

        updatedInvoice = {
          ...existing,
          ...updatedInvoice,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        }

        return updatedInvoice
      })

      return sortByUpdated(updated)
    })

    return updatedInvoice
  }, [])

  const deleteInvoice = useCallback((id: string) => {
    setInvoices((prevInvoices) => prevInvoices.filter((invoice) => invoice.id !== id))
  }, [])

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
    setProjects(seed.projects)
    setInvoices(seed.invoices)
  }, [])

  const value = useMemo(
    () => ({
      projects,
      invoices,
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
