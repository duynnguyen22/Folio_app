'use client';

import { type ApiError, fieldErrors, loginSchema, signupSchema } from '@folio/shared';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useRef, useState } from 'react';

type Mode = 'login' | 'signup';
type Field = 'displayName' | 'email' | 'password';

const COPY = {
  login: { submit: 'Sign in', pending: 'Signing in…', endpoint: '/api/auth/login' },
  signup: { submit: 'Create account', pending: 'Creating account…', endpoint: '/api/auth/signup' },
} as const;

const UNREACHABLE = "Can't reach Folio right now. Try again.";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const id = useId();
  const inFlight = useRef(false);
  const [values, setValues] = useState({ displayName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const copy = COPY[mode];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const input =
      mode === 'signup'
        ? values
        : { email: values.email, password: values.password };
    const parsed = (mode === 'signup' ? signupSchema : loginSchema).safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      setFormError(null);
      return;
    }

    inFlight.current = true;
    setPending(true);
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch(copy.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (res.ok) {
        router.replace('/');
        router.refresh();
        return;
      }
      const body = (await res.json().catch(() => null)) as ApiError | null;
      if (body?.fields) setErrors(body.fields);
      setFormError(body?.message ?? UNREACHABLE);
    } catch {
      setFormError(UNREACHABLE);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function field(name: Field, label: string, type: string, autoComplete: string) {
    const inputId = `${id}-${name}`;
    const errorId = `${inputId}-error`;
    const error = errors[name];
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm text-text-dim">
          {label}
        </label>
        <input
          id={inputId}
          name={name}
          type={type}
          autoComplete={autoComplete}
          value={values[name]}
          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 rounded-lg border border-line bg-desk-3 px-3 text-text outline-none focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/40 aria-invalid:border-danger"
        />
        {error && (
          <p id={errorId} className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {mode === 'signup' && field('displayName', 'Your name', 'text', 'name')}
      {field('email', 'Email', 'email', 'email')}
      {field('password', 'Password', 'password', mode === 'signup' ? 'new-password' : 'current-password')}
      {formError && (
        <p role="alert" className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 min-h-11 rounded-full bg-brass px-6 font-semibold text-[var(--brass-ink)] transition-colors hover:bg-brass-hi disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? copy.pending : copy.submit}
      </button>
    </form>
  );
}
