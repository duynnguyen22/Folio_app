const GUEST_ONLY = new Set(['/login', '/signup']);
const ALWAYS_OPEN = new Set(['/session-expired']);

/** Where to redirect a request, or null to let it through. */
export function routeDecision(pathname: string, hasSession: boolean): string | null {
  if (ALWAYS_OPEN.has(pathname)) return null;
  if (GUEST_ONLY.has(pathname)) return hasSession ? '/' : null;
  return hasSession ? null : `/login?next=${encodeURIComponent(pathname)}`;
}
