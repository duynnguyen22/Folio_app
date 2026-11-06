import { SESSION_COOKIE_NAME } from '@folio/shared';
import { type NextRequest, NextResponse } from 'next/server';

/** Clears a stale session cookie and sends the person to sign in; always reachable, so no loop. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
