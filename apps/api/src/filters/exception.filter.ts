import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationException } from './validation.filter';
import { MAX_FILE_SIZE_IN_BYTES } from '../constants/multer.constants';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    let status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    let message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';
    const stack =
      process.env.NODE_ENV === 'development' && exception instanceof Error
        ? exception.stack
        : undefined;

    const name =
      (exception instanceof Error &&
        exception.name &&
        String(exception.name).trim()) ||
      '';
    const errMsg = (exception instanceof Error && exception.message) || '';
    const code = (exception as any)?.code;

    if (exception instanceof ValidationException) {
      message = exception.validationErrors[0];
      status = 400;
      //JWT token invalid
    } else if (name === 'TokenExpiredError') {
      status = 401;
      message = 'Your session has expired. Please log in again.';
      //JWT token expired
    } else if (name === 'JsonWebTokenError' || name === 'NotBeforeError') {
      status = 401;
      message = 'Invalid token';
    } else if (name === 'QueryFailedError' && code === '23505') {
      // PostgreSQL unique constraint violation
      status = 409;
      const detail = exception.detail || errMsg;
      const match = detail.match(/Key \(([^)]+)\)=\(([^)]+)\)/);

      if (match) {
        const [, key, value] = match;
        message = `A record with ${key} '${value}' already exists.`;
      } else {
        const duplicateKeyMatch = errMsg.match(/\{\s*([^:]+)\s*:/);
        const key =
          (duplicateKeyMatch &&
            duplicateKeyMatch[1] &&
            duplicateKeyMatch[1].trim().replace(/["']/g, '')) ||
          'record';
        message = `A record with this ${key} already exists.`;
      }
    } else if (name === 'QueryFailedError' && code === '23503') {
      // PostgreSQL foreign key violation
      status = 400;
      message =
        'Foreign key constraint error: Referenced record does not exist.';
    } else if (name === 'QueryFailedError' && code === '23502') {
      // PostgreSQL not-null violation
      status = 400;
      message = 'A required field is missing.';
    } else if (name === 'QueryFailedError' && code === '22P02') {
      // PostgreSQL invalid text representation (e.g., invalid UUID)
      status = 400;
      message = 'Invalid identifier format.';
    } else if (name === 'MulterError') {
      // Multer rejects oversized/too-many files before the handler runs, and
      // throws a raw MulterError — which would otherwise surface as an opaque
      // 500 "Internal server error", leaving the user with nothing to act on.
      const maxMb = MAX_FILE_SIZE_IN_BYTES / (1024 * 1024);
      if (code === 'LIMIT_FILE_SIZE') {
        status = 413;
        message = `That file is too large. The maximum size is ${maxMb} MB per file.`;
      } else if (code === 'LIMIT_FILE_COUNT') {
        status = 400;
        message = 'Too many files in one upload.';
      } else if (code === 'LIMIT_UNEXPECTED_FILE') {
        status = 400;
        message = 'Unexpected file field in the upload.';
      } else {
        status = 400;
        message = errMsg || 'Upload failed.';
      }
    } else if (name === 'EntityNotFoundError') {
      // TypeORM entity not found
      status = 404;
      message = 'Resource not found.';
      // PostgreSQL deadlock detected
    } else if (
      name === 'QueryFailedError' ||
      name === 'ConnectionError' ||
      name === 'ConnectionNotFoundError' ||
      name === 'CannotConnectAlreadyConnectedError' ||
      errMsg.includes('ECONNREFUSED')
    ) {
      // PostgreSQL connection errors
      status = 503;
      message = 'Service temporarily unavailable. Please try again later.';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string }).message ||
            exception.message;
    } else {
      Logger.error('[Unhandled Error]', exception);
    }

    response.status(status).json({
      success: status >= 200 && status < 300,
      statusCode: status,
      message: message,
      ...(stack && { stack }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
