import 'server-only';
import { type PublicUser, SESSION_COOKIE_NAME } from '@folio/shared';
import { cookies } from 'next/headers';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** The signed-in user, or null when there is no valid session. Throws if the API is unreachable. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    cache: 'no-store',
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`GET /auth/me failed with ${res.status}`);
  return (await res.json()) as PublicUser;
}
