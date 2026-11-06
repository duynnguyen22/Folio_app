import { describe, expect, it } from 'vitest';
import { routeDecision } from './route-decision';

describe('routeDecision', () => {
  it.each([
    ['/', false, '/login?next=%2F'],
    ['/shelf/x', false, '/login?next=%2Fshelf%2Fx'],
    ['/login', false, null],
    ['/signup', false, null],
    ['/session-expired', false, null],
    ['/session-expired', true, null], // must stay reachable with a stale cookie, or the loop returns
    ['/', true, null],
    ['/login', true, '/'],
    ['/signup', true, '/'],
  ])('%s with session=%s → %s', (path, has, expected) => {
    expect(routeDecision(path, has)).toBe(expected);
  });
});
