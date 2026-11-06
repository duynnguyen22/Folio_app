import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '../generated/prisma/client';
import type { AuthedRequest } from './session.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<AuthedRequest>().user!,
);
