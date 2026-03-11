import type { NextFunction, Request, Response } from 'express'
import { ZodError, type ZodType } from 'zod'

export class AppError extends Error {
  statusCode: number
  code: string

  constructor(statusCode: number, message: string, code = 'APP_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export const asyncHandler = <
  TRequest extends Request = Request,
  TResponse extends Response = Response,
>(
  handler: (request: TRequest, response: TResponse, next: NextFunction) => Promise<unknown>,
) => {
  return (request: TRequest, response: TResponse, next: NextFunction) => {
    void handler(request, response, next).catch(next)
  }
}

export const parseBody = <T>(schema: ZodType<T>, body: unknown): T => schema.parse(body)

export const getRouteParam = (value: string | string[] | undefined, name = 'id') => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim().length > 0) {
    return value[0]
  }

  throw new AppError(400, `Invalid route parameter: ${name}.`, 'INVALID_ROUTE_PARAM')
}

export const getErrorResponse = (error: unknown) => {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      payload: {
        error: error.code,
        message: error.message,
      },
    }
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      payload: {
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: error.flatten(),
      },
    }
  }

  return {
    statusCode: 500,
    payload: {
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  }
}
