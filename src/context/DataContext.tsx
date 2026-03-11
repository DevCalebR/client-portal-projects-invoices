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
import { apiFetch } from '../lib/api'
import type {
  ActivityEvent,
  CheckoutRequest,
  Client,
  ClientInput,
  Invoice,
  InvoiceInput,
  Notification,
  Payment,
  Project,
  ProjectInput,
} from '../types/entities'
import { useAuth } from './AuthContext'

interface DataContextType {
  clients: Client[]
  projects: Project[]
  invoices: Invoice[]
  notifications: Notification[]
  activities: ActivityEvent[]
  isLoading: boolean
  refresh: () => Promise<void>
  createClient: (input: ClientInput) => Promise<Client>
  updateClient: (id: string, input: ClientInput) => Promise<Client>
  createProject: (input: ProjectInput) => Promise<Project>
  updateProject: (id: string, input: ProjectInput) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  createInvoice: (input: InvoiceInput) => Promise<Invoice>
  updateInvoice: (id: string, input: InvoiceInput) => Promise<Invoice>
  deleteInvoice: (id: string) => Promise<void>
  createCheckout: (input: CheckoutRequest) => Promise<{ url: string }>
  createCustomerPortal: () => Promise<{ url: string }>
  markNotificationRead: (id: string) => Promise<Notification>
  getProject: (id: string) => Project | undefined
  getInvoice: (id: string) => Invoice | undefined
  fetchProjectDetail: (id: string) => Promise<{ project: Project; activity: ActivityEvent[] }>
  fetchInvoiceDetail: (id: string) => Promise<{
    invoice: Invoice
    payments: Payment[]
    activity: ActivityEvent[]
  }>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within DataProvider')
  }
  return context
}

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { isSignedIn, organization, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activities, setActivities] = useState<ActivityEvent[]>([])

  const refresh = useCallback(async () => {
    if (!isSignedIn || !organization) {
      setClients([])
      setProjects([])
      setInvoices([])
      setNotifications([])
      setActivities([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const [clientsResponse, projectsResponse, invoicesResponse, notificationsResponse, activityResponse] =
        await Promise.all([
          apiFetch<{ clients: Client[] }>('/api/clients'),
          apiFetch<{ projects: Project[] }>('/api/projects'),
          apiFetch<{ invoices: Invoice[] }>('/api/invoices'),
          apiFetch<{ notifications: Notification[] }>('/api/notifications'),
          apiFetch<{ activity: ActivityEvent[] }>('/api/activity'),
        ])

      setClients(clientsResponse.clients)
      setProjects(projectsResponse.projects)
      setInvoices(invoicesResponse.invoices)
      setNotifications(notificationsResponse.notifications)
      setActivities(activityResponse.activity)
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, organization])

  useEffect(() => {
    if (loading) {
      return
    }

    void refresh()
  }, [loading, refresh])

  const createClient = useCallback(async (input: ClientInput) => {
    const response = await apiFetch<{ client: Client }>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    setClients((current) => [...current, response.client])
    return response.client
  }, [])

  const updateClient = useCallback(async (id: string, input: ClientInput) => {
    const response = await apiFetch<{ client: Client }>(`/api/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    setClients((current) => current.map((client) => (client.id === id ? response.client : client)))
    return response.client
  }, [])

  const createProject = useCallback(async (input: ProjectInput) => {
    const response = await apiFetch<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    setProjects((current) => [response.project, ...current])
    return response.project
  }, [])

  const updateProject = useCallback(async (id: string, input: ProjectInput) => {
    const response = await apiFetch<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    setProjects((current) => current.map((project) => (project.id === id ? response.project : project)))
    await refresh()
    return response.project
  }, [refresh])

  const deleteProject = useCallback(async (id: string) => {
    await apiFetch<void>(`/api/projects/${id}`, {
      method: 'DELETE',
    })
    setProjects((current) => current.filter((project) => project.id !== id))
    setInvoices((current) => current.filter((invoice) => invoice.project?.id !== id))
    await refresh()
  }, [refresh])

  const createInvoice = useCallback(async (input: InvoiceInput) => {
    const response = await apiFetch<{ invoice: Invoice }>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    setInvoices((current) => [response.invoice, ...current])
    await refresh()
    return response.invoice
  }, [refresh])

  const updateInvoice = useCallback(async (id: string, input: InvoiceInput) => {
    const response = await apiFetch<{ invoice: Invoice }>(`/api/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    setInvoices((current) => current.map((invoice) => (invoice.id === id ? response.invoice : invoice)))
    await refresh()
    return response.invoice
  }, [refresh])

  const deleteInvoice = useCallback(async (id: string) => {
    await apiFetch<void>(`/api/invoices/${id}`, {
      method: 'DELETE',
    })
    setInvoices((current) => current.filter((invoice) => invoice.id !== id))
    await refresh()
  }, [refresh])

  const createCheckout = useCallback(async (input: CheckoutRequest) => {
    return apiFetch<{ url: string }>('/api/payments/create-checkout', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }, [])

  const createCustomerPortal = useCallback(async () => {
    return apiFetch<{ url: string }>('/api/payments/customer-portal', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }, [])

  const markNotificationRead = useCallback(async (id: string) => {
    const response = await apiFetch<{ notification: Notification }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    })
    setNotifications((current) =>
      current.map((notification) => (notification.id === id ? response.notification : notification)),
    )
    return response.notification
  }, [])

  const getProject = useCallback(
    (id: string): Project | undefined => projects.find((project) => project.id === id),
    [projects],
  )

  const getInvoice = useCallback(
    (id: string): Invoice | undefined => invoices.find((invoice) => invoice.id === id),
    [invoices],
  )

  const fetchProjectDetail = useCallback(
    (id: string) => apiFetch<{ project: Project; activity: ActivityEvent[] }>(`/api/projects/${id}`),
    [],
  )

  const fetchInvoiceDetail = useCallback(
    (id: string) =>
      apiFetch<{ invoice: Invoice; payments: Payment[]; activity: ActivityEvent[] }>(`/api/invoices/${id}`),
    [],
  )

  const value = useMemo(
    () => ({
      clients,
      projects,
      invoices,
      notifications,
      activities,
      isLoading,
      refresh,
      createClient,
      updateClient,
      createProject,
      updateProject,
      deleteProject,
      createInvoice,
      updateInvoice,
      deleteInvoice,
      createCheckout,
      createCustomerPortal,
      markNotificationRead,
      getProject,
      getInvoice,
      fetchProjectDetail,
      fetchInvoiceDetail,
    }),
    [
      clients,
      projects,
      invoices,
      notifications,
      activities,
      isLoading,
      refresh,
      createClient,
      updateClient,
      createProject,
      updateProject,
      deleteProject,
      createInvoice,
      updateInvoice,
      deleteInvoice,
      createCheckout,
      createCustomerPortal,
      markNotificationRead,
      getProject,
      getInvoice,
      fetchProjectDetail,
      fetchInvoiceDetail,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
