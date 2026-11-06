import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './create-app';

describe('GET /health', () => {
  describe('with the database up', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await createTestApp();
    });
    afterAll(async () => {
      await app.close();
    });

    it('reports ok for the API and the database', async () => {
      await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok', db: 'ok' });
    });
  });

  describe('with the database down', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await createTestApp((b) =>
        b.overrideProvider(PrismaService).useValue({
          $queryRaw: () => Promise.reject(new Error('connection refused')),
        }),
      );
    });
    afterAll(async () => {
      await app.close();
    });

    it('returns 503 and says the database is down', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(503, { status: 'error', db: 'down' });
    });
  });
});
