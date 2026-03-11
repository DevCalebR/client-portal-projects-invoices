import { z } from 'zod'
import { INVOICE_STATUS_OPTIONS, PROJECT_STATUS_OPTIONS } from '../types/entities'

const publicUserSchemaBase = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  role: z.enum(['admin', 'client']),
  company: z.string().trim().min(1).optional(),
})

export const userSchema = publicUserSchemaBase.extend({
  passwordHash: z.string().trim().min(32),
})

export const legacyUserSchema = publicUserSchemaBase.extend({
  password: z.string().trim().min(6),
})

export const storedUserSchema = z.union([userSchema, legacyUserSchema])

export const projectSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2),
  clientId: z.string().trim().min(1),
  status: z.enum(PROJECT_STATUS_OPTIONS),
  dueDate: z.string().trim().optional(),
  notes: z.string(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
})

export const invoiceLineItemSchema = z.object({
  id: z.string().trim().min(1),
  description: z.string().trim().min(1),
  quantity: z.number().finite().min(1),
  rate: z.number().finite().min(0),
})

export const invoiceSchema = z.object({
  id: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  clientId: z.string().trim().min(1),
  status: z.enum(INVOICE_STATUS_OPTIONS),
  lineItems: z.array(invoiceLineItemSchema),
  subtotal: z.number().finite().min(0),
  total: z.number().finite().min(0),
  issueDate: z.string().trim().min(1),
  dueDate: z.string().trim().min(1),
  notes: z.string(),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
})

export const activitySchema = z.object({
  id: z.string().trim().min(1),
  actorId: z.string().trim().min(1),
  actorName: z.string().trim().min(1),
  action: z.enum(['created', 'updated', 'deleted', 'restored']),
  subjectType: z.enum(['project', 'invoice', 'system']),
  subjectId: z.string().trim().min(1),
  subjectName: z.string().trim().min(1),
  description: z.string().trim().min(1),
  timestamp: z.string().trim().min(1),
})

export const sessionSchema = z.object({
  userId: z.string().trim().min(1),
  signedInAt: z.string().trim().min(1),
})
