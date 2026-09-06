/** Global HTTP Exception Filter with structured logging and environment-aware messages */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'object' && 'message' in res ? (res as any).message : res;
    } else if ((exception as any)?.code && typeof (exception as any).code === 'string' && (exception as any).code.startsWith('P')) {
      const pCode = (exception as any).code;
      if (pCode === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = (exception as any).meta?.target;
        message = `Unique constraint conflict on: ${Array.isArray(target) ? target.join(', ') : target || 'field'}`;
      } else if (pCode === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'The requested database record was not found.';
      } else if (pCode === 'P2028') {
        status = HttpStatus.GATEWAY_TIMEOUT;
        message = 'Database operation timed out. Please try again.';
      } else if (pCode === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Referenced related item does not exist.';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = (exception as any).message || 'Database error occurred.';
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message =
        process.env.NODE_ENV === 'production'
          ? 'An internal error occurred. Please try again later.'
          : exception.message;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message.join(', ') : message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
