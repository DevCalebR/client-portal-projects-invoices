import type { RequestContext } from './app'

declare global {
  namespace Express {
    interface Request {
      platform?: RequestContext
    }
  }
}

export {}

