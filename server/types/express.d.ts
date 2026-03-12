import type { RequestContext } from './app.js'

declare global {
  namespace Express {
    interface Request {
      platform?: RequestContext
    }
  }
}

export {}
