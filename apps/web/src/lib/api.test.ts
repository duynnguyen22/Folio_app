import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser } from './api';

let cookieValue: string | undefined = 'abc';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === 'folio_session' && cookieValue !== undefined ? { name, value: cookieValue } : undefined,
  }),
}));

const fetchMock = vi.fn();
const ana = { id: '1', email: 'ana@example.com', displayName: 'Ana', createdAt: '2026-11-06T00:00:00.000Z' };

beforeEach(() => {
  cookieValue = 'abc';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('getCurrentUser', () => {
  it('returns the user and forwards the session cookie without caching', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(ana), { status: 200 }));
    expect(await getCurrentUser()).toEqual(ana);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://localhost:4000/auth/me');
    expect(new Headers(init.headers).get('cookie')).toBe('folio_session=abc');
    expect(init.cache).toBe('no-store');
  });
  it('returns null on a 401', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 401 }));
    expect(await getCurrentUser()).toBeNull();
  });
  it('throws on a 500', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));
    await expect(getCurrentUser()).rejects.toThrow();
  });
  it('throws when the API cannot be reached', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(getCurrentUser()).rejects.toThrow();
  });
  it('returns null without calling the API when there is no cookie', async () => {
    cookieValue = undefined;
    expect(await getCurrentUser()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
