import { Global, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ENV, loadEnv } from './config/env';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HealthController],
  providers: [{ provide: ENV, useFactory: () => loadEnv(process.env) }],
  exports: [ENV],
})
export class AppModule {}
