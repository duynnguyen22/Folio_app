import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SESSION_COOKIE_NAME } from '@folio/shared';
import type { Request } from 'express';
import type { User } from '../generated/prisma/client';
import { SessionService } from './session.service';

export type AuthedRequest = Request & { user?: User };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];
    const user = typeof token === 'string' && token ? await this.sessions.findUser(token) : null;
    if (!user) throw new UnauthorizedException({ message: 'Not signed in.' });
    req.user = user;
    return true;
  }
}
