import { z } from 'zod';

export const ENV = Symbol('ENV');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
});

export type Env = z.infer<typeof schema> & { COOKIE_SECURE: boolean };

export function loadEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((i) => String(i.path[0])))];
    throw new Error(`Invalid environment: ${names.join(', ')}`);
  }
  return { ...result.data, COOKIE_SECURE: result.data.NODE_ENV === 'production' };
}
