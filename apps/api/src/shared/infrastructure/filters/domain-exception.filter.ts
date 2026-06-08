import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { DomainError } from '@shared/domain';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const httpException = exception.toHttpException() as HttpException;
    const status = httpException.getStatus();
    const exceptionResponse = httpException.getResponse();

    this.logger.error(
      `Domain error occurred: ${exception.code} - ${exception.message}`,
      {
        path: request.url,
        method: request.method,
        code: exception.code,
        stack: exception.stack,
      },
    );

    response.status(status).send({
      statusCode: status,
      error: exception.code,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as Record<string, unknown>).message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
