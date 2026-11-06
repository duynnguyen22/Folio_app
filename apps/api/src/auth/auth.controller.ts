import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  type LoginInput,
  type PublicUser,
  SESSION_COOKIE_NAME,
  type SignupInput,
  loginSchema,
  signupSchema,
} from '@folio/shared';
import type { CookieOptions, Request, Response } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ENV, type Env } from '../config/env';
import type { User } from '../generated/prisma/client';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { toPublicUser } from './public-user';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post('signup')
  @HttpCode(201)
  @UseGuards(ThrottlerGuard)
  async signup(
    @Body(new ZodValidationPipe(signupSchema)) input: SignupInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const user = await this.auth.signup(input);
    await this.startSession(user, res);
    return toPublicUser(user);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PublicUser> {
    const user = await this.auth.login(input);
    await this.startSession(user, res);
    return toPublicUser(user);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];
    // Clear the cookie first so the browser is logged out even if revoking fails.
    res.clearCookie(SESSION_COOKIE_NAME, this.cookieOptions());
    if (typeof token === 'string' && token) await this.sessions.revoke(token);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: User): PublicUser {
    return toPublicUser(user);
  }

  private async startSession(user: User, res: Response): Promise<void> {
    const { token, expiresAt } = await this.sessions.create(user.id);
    res.cookie(SESSION_COOKIE_NAME, token, { ...this.cookieOptions(), expires: expiresAt });
  }

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, sameSite: 'lax', path: '/', secure: this.env.COOKIE_SECURE };
  }
}
