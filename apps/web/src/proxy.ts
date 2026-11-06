import { SESSION_COOKIE_NAME } from '@folio/shared';
import { type NextRequest, NextResponse } from 'next/server';
import { routeDecision } from './lib/route-decision';

export function proxy(request: NextRequest) {
  const target = routeDecision(request.nextUrl.pathname, request.cookies.has(SESSION_COOKIE_NAME));
  return target ? NextResponse.redirect(new URL(target, request.url)) : NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)'],
};
