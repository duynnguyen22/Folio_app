import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './auth-form';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));

const fetchMock = vi.fn();

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function fillLogin(email = 'ana@example.com', password = 'correct horse') {
  await userEvent.type(screen.getByLabelText('Email'), email);
  await userEvent.type(screen.getByLabelText('Password'), password);
}

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AuthForm', () => {
  it('shows field errors and does not call the API when sign-up input is invalid', async () => {
    render(<AuthForm mode="signup" />);
    await userEvent.type(screen.getByLabelText('Your name'), 'Ana');
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the login as JSON and goes to the Room on success', async () => {
    fetchMock.mockResolvedValue(
      json(200, { id: '1', email: 'ana@example.com', displayName: 'Ana', createdAt: '' }),
    );
    render(<AuthForm mode="login" />);
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(refresh).toHaveBeenCalled();
    expect(replace.mock.invocationCallOrder[0]).toBeLessThan(refresh.mock.invocationCallOrder[0]!);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('content-type')).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ email: 'ana@example.com', password: 'correct horse' });
  });

  it('shows the server message on a 401', async () => {
    fetchMock.mockResolvedValue(json(401, { message: 'Email or password is incorrect.' }));
    render(<AuthForm mode="login" />);
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    expect(replace).not.toHaveBeenCalled();
  });

  it('shows server field errors under the field on a 400', async () => {
    fetchMock.mockResolvedValue(
      json(400, {
        message: 'Check the highlighted fields.',
        fields: { email: 'Enter a valid email address.' },
      }),
    );
    render(<AuthForm mode="login" />);
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const email = screen.getByLabelText('Email');
    await waitFor(() => expect(email).toHaveAccessibleDescription('Enter a valid email address.'));
  });

  it("says Folio can't be reached when the request fails", async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<AuthForm mode="login" />);
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Can't reach Folio right now. Try again.",
    );
  });

  it('sends once on a double click and shows a disabled pending button', async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    render(<AuthForm mode="login" />);
    await fillLogin();
    await userEvent.dblClick(screen.getByRole('button', { name: 'Sign in' }));
    const pending = await screen.findByRole('button', { name: 'Signing in…' });
    expect(pending).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve(json(401, { message: 'Email or password is incorrect.' }));
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('labels the sign-up pending button', async () => {
    fetchMock.mockReturnValue(new Promise<Response>(() => {}));
    render(<AuthForm mode="signup" />);
    await userEvent.type(screen.getByLabelText('Your name'), 'Ana');
    await fillLogin();
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('button', { name: 'Creating account…' })).toBeDisabled();
  });

  it('labels every input', () => {
    const { unmount } = render(<AuthForm mode="signup" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toBeInTheDocument();
    unmount();
    render(<AuthForm mode="login" />);
    expect(screen.queryByLabelText('Your name')).not.toBeInTheDocument();
  });
});
