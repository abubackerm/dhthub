import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { EventEmitter2 } from '@nestjs/event-emitter';
import multipart from '@fastify/multipart';
import fastifyCompress from '@fastify/compress';
import { AppModule } from './app.module';
import { DomainExceptionFilter, LoggingInterceptor } from '@shared/infrastructure';
import { auth, setAuthEventEmitter } from './modules/auth/auth';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ requestTimeout: 30_000 }),
  );

  const eventEmitter = app.get(EventEmitter2);
  setAuthEventEmitter(eventEmitter);

  const fastify = app.getHttpAdapter().getInstance();

  await fastify.register(multipart, {
    limits: {
      fileSize: 200 * 1024 * 1024, // 200MB
    },
  });

  await fastify.register(fastifyCompress, {
    global: true,
    threshold: 1024,
  });

  fastify.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      try {
        const url = new URL(
          request.url,
          `http://${request.headers.host ?? 'localhost'}`,
        );

        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) {
            headers.append(key, String(value));
          }
        });

        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        const response = await auth.handler(req);

        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));

        const textBody = await response.text();
        reply.send(textBody.length ? textBody : null);
      } catch (error) {
        reply.status(500).send({
          error: 'Internal authentication error',
          code: 'AUTH_FAILURE',
        });
      }
    },
  });

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new DomainExceptionFilter());

  app.enableCors({
    origin: [
      process.env.WEB_URL || 'http://localhost:3005',
      'http://localhost:3005',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.API_PORT || 3001;
  await app.listen(port);

  console.log(`API is running on: http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('API failed to start:', err);
  process.exit(1);
});
