import type { Request } from 'express';

/** Rate-limit key for sign up and log in: the email as the schema will normalize it. */
export function accountTracker(req: Record<string, unknown>): string {
  const body = (req as unknown as Request).body as { email?: unknown } | undefined;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  return `account:${email}`;
}
