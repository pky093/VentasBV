import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const isZodError = (err: unknown): err is ZodError => {
  return err instanceof ZodError;
};

export const notFound: RequestHandler = (req, res, next) => {
  next(new AppError(404, 'not_found', 'Ruta no encontrada'));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (isZodError(err)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'validation_error',
        message: 'Datos de entrada inválidos',
        details: err.issues,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  const requestId = req.id || 'unknown';
  logger.error({ err, requestId }, 'Error no manejado');

  res.status(500).json({
    success: false,
    error: {
      code: 'internal_error',
      message: 'Error interno del servidor',
      requestId,
    },
  });
};
