import 'express'
import type { PlatformRequestContext } from './app.js'

declare module 'express-serve-static-core' {
  interface Request {
    platform?: PlatformRequestContext
  }
}

export {}
