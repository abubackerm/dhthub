import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { auth } from './auth';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.session) {
      throw new UnauthorizedException();
    }

    request.session = session.session;
    request.user = session.user;
    return true;
  }
}
