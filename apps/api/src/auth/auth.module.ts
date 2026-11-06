import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { accountTracker } from './account-tracker';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        // Per account: brute force against one email, independent of the caller's address.
        { name: 'account', ttl: 60_000, limit: 10, getTracker: accountTracker },
        // Per address: caps work (argon2) when someone sprays many emails. Behind the
        // website every visitor shares one address, so this is generous.
        { name: 'address', ttl: 60_000, limit: 30 },
      ],
      errorMessage: 'Too many attempts. Try again in a minute.',
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, SessionGuard],
  exports: [SessionService, SessionGuard],
})
export class AuthModule {}
