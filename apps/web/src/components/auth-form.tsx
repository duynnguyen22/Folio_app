'use client';

import { type ApiError, fieldErrors, loginSchema, signupSchema } from '@folio/shared';
import { AlertCircleIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useRef, useState } from 'react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

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

    const input = mode === 'signup' ? values : { email: values.email, password: values.password };
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
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
        <Input
          id={inputId}
          name={name}
          type={type}
          autoComplete={autoComplete}
          value={values[name]}
          onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11"
        />
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </Field>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit}>
      <FieldGroup>
        {mode === 'signup' && field('displayName', 'Your name', 'text', 'name')}
        {field('email', 'Email', 'email', 'email')}
        {field(
          'password',
          'Password',
          'password',
          mode === 'signup' ? 'new-password' : 'current-password',
        )}
        {formError && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>{formError}</AlertTitle>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={pending} className="min-h-11 w-full">
          {pending && (
            <Spinner
              data-icon="inline-start"
              aria-hidden="true"
              role={undefined}
              aria-label={undefined}
            />
          )}
          {pending ? copy.pending : copy.submit}
        </Button>
      </FieldGroup>
    </form>
  );
}
