import { z } from 'zod';

export const LIMITS = {
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 128,
  displayNameMax: 50,
} as const;

export const SESSION_COOKIE_NAME = 'folio_session';

const INVALID_EMAIL = 'Enter a valid email address.';

const email = z
  .string({ error: INVALID_EMAIL })
  .trim()
  .toLowerCase()
  .max(LIMITS.emailMax, { error: INVALID_EMAIL })
  .pipe(z.email({ error: INVALID_EMAIL }));

export const signupSchema = z.object({
  email,
  password: z
    .string({ error: `Password must be at least ${LIMITS.passwordMin} characters.` })
    .min(LIMITS.passwordMin, { error: `Password must be at least ${LIMITS.passwordMin} characters.` })
    .max(LIMITS.passwordMax, { error: `Password must be at most ${LIMITS.passwordMax} characters.` }),
  displayName: z
    .string({ error: 'Enter your name.' })
    .trim()
    .min(1, { error: 'Enter your name.' })
    .max(LIMITS.displayNameMax, { error: `Name must be at most ${LIMITS.displayNameMax} characters.` }),
});

export const loginSchema = z.object({
  email,
  password: z
    .string({ error: 'Enter your password.' })
    .min(1, { error: 'Enter your password.' })
    .max(LIMITS.passwordMax, { error: `Password must be at most ${LIMITS.passwordMax} characters.` }),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
};

export type ApiError = {
  message: string;
  fields?: Record<string, string>;
};

/** First message per top-level field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === undefined) continue;
    const name = String(key);
    if (!(name in out)) out[name] = issue.message;
  }
  return out;
}
