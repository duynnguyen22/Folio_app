import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { LoginInput, SignupInput } from '@folio/shared';
import { Prisma, type User } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './password';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signup(input: SignupInput): Promise<User> {
    const passwordHash = await hashPassword(input.password);
    try {
      return await this.prisma.user.create({
        data: { email: input.email, passwordHash, displayName: input.displayName },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({ message: 'An account with this email already exists.' });
      }
      throw err;
    }
  }

  async login(input: LoginInput): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const ok = await verifyPassword(user?.passwordHash ?? (await DUMMY_PASSWORD_HASH), input.password);
    if (!user || !ok) {
      throw new UnauthorizedException({ message: 'Email or password is incorrect.' });
    }
    return user;
  }
}
