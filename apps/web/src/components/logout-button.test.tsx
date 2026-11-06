import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { LogoutButton } from './logout-button';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));

it('logs out through the API and goes to the login page', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetchMock);
  render(<LogoutButton />);
  await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  expect(refresh).toHaveBeenCalled();
  const [url, init] = fetchMock.mock.calls[0]!;
  expect(url).toBe('/api/auth/logout');
  expect(init.method).toBe('POST');
  vi.unstubAllGlobals();
});

it.each([
  ['the API is unreachable', () => Promise.reject(new TypeError('Failed to fetch'))],
  ['the API errors', () => Promise.resolve(new Response('boom', { status: 500 }))],
])('still clears the cookie when %s', async (_label, impl) => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(impl));
  const assign = vi.fn();
  vi.stubGlobal('location', { ...window.location, assign });
  render(<LogoutButton />);
  await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
  await waitFor(() => expect(assign).toHaveBeenCalledWith('/session-expired'));
  vi.unstubAllGlobals();
});
