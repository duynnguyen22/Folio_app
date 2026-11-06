import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionService } from '../src/auth/session.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-app';
import { resetDb } from './reset-db';

const ana = { email: ' Ana@Example.com ', password: 'correct horse', displayName: 'Ana' };

function cookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'] as unknown;
  return Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
}

function sessionToken(res: request.Response): string {
  const c = cookies(res).find((v) => v.startsWith('folio_session='));
  if (!c) throw new Error('no folio_session cookie');
  return c.split(';')[0]!.slice('folio_session='.length);
}

describe('auth endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDb(prisma);
  });
  afterEach(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('signs up, normalizes the email, hides the hash and sets the cookie', async () => {
    const res = await http().post('/auth/signup').send(ana).expect(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      email: 'ana@example.com',
      displayName: 'Ana',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(res.body).not.toHaveProperty('passwordHash');
    const cookie = cookies(res).find((c) => c.startsWith('folio_session='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('rejects a second account with the same email in any case', async () => {
    await http().post('/auth/signup').send(ana).expect(201);
    const res = await http()
      .post('/auth/signup')
      .send({ ...ana, email: 'ANA@example.com' })
      .expect(409);
    expect(res.body.message).toBe('An account with this email already exists.');
  });

  it('names every invalid field', async () => {
    const res = await http()
      .post('/auth/signup')
      .send({ email: 'nope', password: 'short', displayName: '' })
      .expect(400);
    expect(res.body.message).toBe('Check the highlighted fields.');
    expect(res.body.fields.email).toBeTruthy();
    expect(res.body.fields.password).toBeTruthy();
    expect(res.body.fields.displayName).toBeTruthy();
  });

  it('rejects a 10,000-character password without creating a user', async () => {
    const res = await http()
      .post('/auth/signup')
      .send({ ...ana, password: 'x'.repeat(10_000) })
      .expect(400);
    expect(res.body.fields.password).toBeTruthy();
    expect(await prisma.user.count()).toBe(0);
  });

  it('gives the same 401 for a wrong password and an unknown email', async () => {
    await http().post('/auth/signup').send(ana).expect(201);
    const wrong = await http()
      .post('/auth/login')
      .send({ email: 'ana@example.com', password: 'wrong password' })
      .expect(401);
    const unknown = await http()
      .post('/auth/login')
      .send({ email: 'bob@example.com', password: 'wrong password' })
      .expect(401);
    expect(wrong.body).toEqual({ message: 'Email or password is incorrect.' });
    expect(unknown.body).toEqual(wrong.body);
  });

  it('logs in with any email case and then knows who you are', async () => {
    const signup = await http().post('/auth/signup').send(ana).expect(201);
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/auth/login')
      .send({ email: 'ANA@EXAMPLE.COM', password: 'correct horse' })
      .expect(200);
    expect(cookies(login).some((c) => c.startsWith('folio_session='))).toBe(true);
    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.id).toBe(signup.body.id);
  });

  it('says not signed in without a cookie or with a bad one', async () => {
    const none = await http().get('/auth/me').expect(401);
    expect(none.body.message).toBe('Not signed in.');
    const bad = await http().get('/auth/me').set('Cookie', 'folio_session=garbage').expect(401);
    expect(bad.body.message).toBe('Not signed in.');
  });

  it('logs out: revokes the session and clears the cookie', async () => {
    const agent = request.agent(app.getHttpServer());
    const signup = await agent.post('/auth/signup').send(ana).expect(201);
    const token = sessionToken(signup);
    const out = await agent.post('/auth/logout').expect(204);
    const cleared = cookies(out).find((c) => c.startsWith('folio_session='));
    expect(cleared).toBeDefined();
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/i);
    await http().get('/auth/me').set('Cookie', `folio_session=${token}`).expect(401);
  });

  it('logs out with 204 even without a cookie', async () => {
    await http().post('/auth/logout').expect(204);
  });

  it('throttles the eleventh quick login attempt', async () => {
    const bad = { email: 'ana@example.com', password: 'wrong password' };
    for (let i = 0; i < 10; i++) {
      await http().post('/auth/login').send(bad).expect(401);
    }
    const res = await http().post('/auth/login').send(bad).expect(429);
    expect(res.body.message).toBe('Too many attempts. Try again in a minute.');
  });
  it('does not let a spoofed X-Forwarded-For reset the login limit', async () => {
    const bad = { email: 'ana@example.com', password: 'wrong password' };
    for (let i = 0; i < 10; i++) {
      await http().post('/auth/login').set('X-Forwarded-For', `203.0.113.${i}`).send(bad).expect(401);
    }
    await http().post('/auth/login').set('X-Forwarded-For', '198.51.100.7').send(bad).expect(429);
  });

  it("does not lock other accounts out when one account hits the limit", async () => {
    await http().post('/auth/signup').send(ana).expect(201);
    const bad = { email: 'mallory@example.com', password: 'wrong password' };
    for (let i = 0; i < 10; i++) {
      await http().post('/auth/login').send(bad).expect(401);
    }
    await http().post('/auth/login').send({ email: 'ana@example.com', password: ana.password }).expect(200);
  });

  it('caps attempts from one address across many emails', async () => {
    let last = 0;
    for (let i = 0; i < 31; i++) {
      const res = await http().post('/auth/login').send({ email: `user${i}@example.com`, password: 'wrong password' });
      last = res.status;
    }
    expect(last).toBe(429);
  });
});

describe('logout when the session store fails', () => {
  it('still clears the cookie', async () => {
    const app = await createTestApp((b) =>
      b.overrideProvider(SessionService).useValue({
        revoke: () => Promise.reject(new Error('db down')),
        create: () => Promise.reject(new Error('unused')),
        findUser: () => Promise.resolve(null),
      }),
    );
    try {
      const res = await request(app.getHttpServer()).post('/auth/logout').set('Cookie', 'folio_session=abc');
      const cleared = cookies(res).find((c) => c.startsWith('folio_session='));
      expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/i);
    } finally {
      await app.close();
    }
  });
});

