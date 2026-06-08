import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ActiveSession = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const session = request.session as unknown;

    if (!field) {
      return session;
    }

    if (session && typeof session === 'object' && field in session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (session as any)[field];
    }

    return undefined;
  },
);

