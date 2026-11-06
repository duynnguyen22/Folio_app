import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';

export function configureApp(app: INestApplication): INestApplication {
  // X-Forwarded-For is deliberately NOT trusted: Next's /api rewrite does not set it,
  // so any value is client-supplied and would let anyone dodge rate limits.
  app.use(cookieParser());
  app.enableShutdownHooks();
  return app;
}
