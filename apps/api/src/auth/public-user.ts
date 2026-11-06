import type { PublicUser } from '@folio/shared';
import type { User } from '../generated/prisma/client';

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  };
}
