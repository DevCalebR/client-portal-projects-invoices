import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { clerkMiddleware } from '@clerk/express'
import { authRouter } from './routes/auth.js'
import { activityRouter } from './routes/activity.js'
import { clientsRouter } from './routes/clients.js'
import { invoicesRouter } from './routes/invoices.js'
import { notificationsRouter } from './routes/notifications.js'
import { handleStripeWebhook, paymentsRouter } from './routes/payments.js'
import { projectsRouter } from './routes/projects.js'
import { getErrorResponse } from './lib/http.js'
import { captureServerException, initServerSentry } from './lib/sentry.js'

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
