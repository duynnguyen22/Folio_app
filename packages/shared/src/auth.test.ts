import { describe, expect, it } from 'vitest';
import { fieldErrors, loginSchema, signupSchema } from './auth';

describe('signupSchema', () => {
  it('trims and lowercases the email', () => {
    const r = signupSchema.parse({ email: '  Ana@Example.COM ', password: 'correct horse', displayName: ' Ana ' });
    expect(r.email).toBe('ana@example.com');
    expect(r.displayName).toBe('Ana');
  });
  it('keeps the password exactly as typed', () => {
    expect(signupSchema.parse({ email: 'a@b.co', password: '  pass word  ', displayName: 'A' }).password).toBe('  pass word  ');
  });
  it.each([
    [{ email: 'ana@example', password: 'longenough', displayName: 'A' }, 'email', 'Enter a valid email address.'],
    [{ email: 'a@b.co', password: 'short12', displayName: 'A' }, 'password', 'Password must be at least 8 characters.'],
    [{ email: 'a@b.co', password: 'x'.repeat(129), displayName: 'A' }, 'password', 'Password must be at most 128 characters.'],
    [{ email: 'a@b.co', password: 'x'.repeat(10_000), displayName: 'A' }, 'password', 'Password must be at most 128 characters.'],
    [{ email: 'a@b.co', password: 'longenough', displayName: '   ' }, 'displayName', 'Enter your name.'],
    [{ email: 'a@b.co', password: 'longenough', displayName: 'n'.repeat(51) }, 'displayName', 'Name must be at most 50 characters.'],
  ])('rejects %j on %s', (input, field, message) => {
    const r = signupSchema.safeParse(input);
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!)[field]).toBe(message);
  });
  it('accepts an 8-character password', () => {
    expect(signupSchema.safeParse({ email: 'a@b.co', password: '12345678', displayName: 'A' }).success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('normalizes the email the same way as sign up', () => {
    expect(loginSchema.parse({ email: ' ANA@example.com', password: 'x' }).email).toBe('ana@example.com');
  });
  it('requires a password', () => {
    const r = loginSchema.safeParse({ email: 'a@b.co', password: '' });
    expect(fieldErrors(r.error!).password).toBe('Enter your password.');
  });
  it('rejects passwords over 128 characters', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x'.repeat(129) }).success).toBe(false);
  });
});
