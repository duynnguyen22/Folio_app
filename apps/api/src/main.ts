import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { ENV, type Env } from './config/env';

async function bootstrap() {
  const envFile = join(__dirname, '..', '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const env = app.get<Env>(ENV);
  await app.listen(env.PORT);
}

void bootstrap();
