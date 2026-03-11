import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { clerkMiddleware } from '@clerk/express'
import { authRouter } from './routes/auth'
import { activityRouter } from './routes/activity'
import { clientsRouter } from './routes/clients'
import { invoicesRouter } from './routes/invoices'
import { notificationsRouter } from './routes/notifications'
import { handleStripeWebhook, paymentsRouter } from './routes/payments'
import { projectsRouter } from './routes/projects'
import { getErrorResponse } from './lib/http'
import { captureServerException, initServerSentry } from './lib/sentry'

initServerSentry()

const app = express()

app.set('trust proxy', 1)
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(clerkMiddleware())

app.get('/health', (_request, response) => {
  response.json({ ok: true })
})

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook)

app.use(express.json())

app.use('/api', authRouter)
app.use('/api', activityRouter)
app.use('/api', projectsRouter)
app.use('/api', invoicesRouter)
app.use('/api', clientsRouter)
app.use('/api', paymentsRouter)
app.use('/api', notificationsRouter)

app.use((error: unknown, request: express.Request, response: express.Response, next: express.NextFunction) => {
  void next
  captureServerException(error, {
    method: request.method,
    path: request.path,
  })
  const { statusCode, payload } = getErrorResponse(error)
  response.status(statusCode).json(payload)
})

export default app
