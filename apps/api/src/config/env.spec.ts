import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';

describe('loadEnv', () => {
  it('applies defaults', () => {
    expect(loadEnv({ DATABASE_URL: 'postgresql://u:p@h:5432/d' })).toEqual({
      NODE_ENV: 'development',
      PORT: 4000,
      DATABASE_URL: 'postgresql://u:p@h:5432/d',
      SESSION_TTL_DAYS: 30,
      COOKIE_SECURE: false,
    });
  });
  it('turns on secure cookies in production', () => {
    expect(loadEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@h/d' }).COOKIE_SECURE).toBe(true);
  });
  it('names every missing or invalid variable', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/DATABASE_URL[\s\S]*PORT|PORT[\s\S]*DATABASE_URL/);
  });
});
