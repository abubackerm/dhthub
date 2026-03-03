import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { FastifyRequest, FastifyReply } from 'fastify';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const { method, url, body, params, query } = request;
    const start = Date.now();

    if (MUTATING_METHODS.has(method)) {
      const parts: string[] = [`← ${method} ${url}`];

      if (params && Object.keys(params as object).length > 0) {
        parts.push(`  Params: ${JSON.stringify(params)}`);
      }
      if (query && Object.keys(query as object).length > 0) {
        parts.push(`  Query: ${JSON.stringify(query)}`);
      }
      if (body && Object.keys(body as object).length > 0) {
        parts.push(`  Body: ${JSON.stringify(body)}`);
      }

      this.logger.log(parts.join('\n'));
    }

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const response = ctx.getResponse<FastifyReply>();
          const duration = Date.now() - start;

          if (MUTATING_METHODS.has(method)) {
            const summary = this.summarizeResponse(method, responseBody);
            this.logger.log(`→ ${method} ${url} ${response.statusCode} - ${duration}ms${summary}`);
          } else {
            this.logger.log(`${method} ${url} ${response.statusCode} - ${duration}ms`);
          }
        },
        error: (error) => {
          const duration = Date.now() - start;
          const status = error?.status || error?.getStatus?.() || 500;
          const message = error?.message || 'Unknown error';
          this.logger.warn(`→ ${method} ${url} ${status} - ${duration}ms | ${message}`);
        },
      }),
    );
  }

  private summarizeResponse(method: string, body: unknown): string {
    if (!body || typeof body !== 'object') return '';

    const record = body as Record<string, unknown>;

    const identifiers: string[] = [];
    if (record.id) identifiers.push(`id=${record.id}`);
    if (record.name) identifiers.push(`name="${record.name}"`);
    if (record.slug) identifiers.push(`slug="${record.slug}"`);

    if (identifiers.length === 0) return '';

    const action = method === 'POST' ? 'Created' : method === 'DELETE' ? 'Deleted' : 'Updated';
    return ` | ${action}: ${identifiers.join(', ')}`;
  }
}
