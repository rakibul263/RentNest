import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError';

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errorDetails: err.isOperational
        ? undefined
        : { stack: err.stack },
    });
  }

  // Prisma known errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'A record with this value already exists',
        errorDetails: err.message,
      });
    }
    if (prismaErr.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found',
        errorDetails: err.message,
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Database operation failed',
      errorDetails: err.message,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      errorDetails: err.message,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      errorDetails: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    errorDetails:
      process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

export default errorHandler;
