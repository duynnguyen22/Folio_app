import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../../test/reset-db';
import { loadEnv } from '../config/env';
import type { User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hashToken } from './password';
import { SessionService } from './session.service';

describe('SessionService', () => {
  const env = { ...loadEnv(process.env), SESSION_TTL_DAYS: 30 };
  const prisma = new PrismaService(env);
  const sessions = new SessionService(prisma, env);
  let user: User;

  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await resetDb(prisma);
    user = await prisma.user.create({
      data: { email: 'ana@example.com', passwordHash: 'x', displayName: 'Ana' },
    });
  });

  it('stores only the hash of the token', async () => {
    const { token } = await sessions.create(user.id);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes, base64url
    const row = await prisma.session.findFirstOrThrow();
    expect(row.tokenHash).toBe(hashToken(token));
    expect(row.tokenHash).not.toBe(token);
  });
  it('expires after 30 days', async () => {
    const { expiresAt } = await sessions.create(user.id);
    expect(Math.abs(expiresAt.getTime() - (Date.now() + 30 * 86_400_000))).toBeLessThan(5_000);
  });
  it('finds the user for a live token', async () => {
    const { token } = await sessions.create(user.id);
    expect((await sessions.findUser(token))?.id).toBe(user.id);
  });
  it('returns null for an expired token and deletes the row', async () => {
    const { token } = await sessions.create(user.id);
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await sessions.findUser(token)).toBeNull();
    expect(await prisma.session.count()).toBe(0);
  });
  it('returns null for an unknown token', async () => {
    expect(await sessions.findUser('nope')).toBeNull();
  });
  it('revokes a token, and revoking twice is harmless', async () => {
    const { token } = await sessions.create(user.id);
    await sessions.revoke(token);
    await sessions.revoke(token);
    expect(await sessions.findUser(token)).toBeNull();
  });
});
