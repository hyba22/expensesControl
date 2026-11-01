import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { MailService } from '../mail/mail.service.js';
import { TokensService } from './tokens.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { Env } from '../config/env.js';

const RESET_LINK_MINUTES = 30;

const hashPassword = (password: string) =>
  argon2.hash(password, { type: argon2.argon2id });
const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  // Used when the email is unknown, so a failed login takes the same time
  // whether or not the account exists (no account discovery by timing).
  private readonly dummyHash = argon2.hash('not-a-real-password');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly users: UsersService,
    private readonly tokens: TokensService,
    private readonly categories: CategoriesService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string) {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      currency: dto.currency,
      passwordHash: await hashPassword(dto.password),
    });
    await this.categories.ensureDefaults(user.id);
    const tokens = await this.tokens.issue(user, userAgent);
    return { user: this.users.toPublic(user), tokens };
  }

  async login(dto: LoginDto, userAgent?: string) {
    const user = await this.users.findByEmail(dto.email);
    const valid = await argon2.verify(
      user?.passwordHash ?? (await this.dummyHash),
      dto.password,
    );
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const tokens = await this.tokens.issue(user, userAgent);
    return { user: this.users.toPublic(user), tokens };
  }

  async refresh(refreshToken: string, userAgent?: string) {
    const { user, tokens } = await this.tokens.rotate(refreshToken, userAgent);
    return { user: this.users.toPublic(user), tokens };
  }

  logout(refreshToken: string) {
    return this.tokens.revoke(refreshToken);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.users.toPublic(user);
  }

  // The answer is the same whether the email exists or not, so this can't be
  // used to find out who has an account.
  async forgotPassword(email: string, language: 'fr' | 'en' = 'fr') {
    const user = await this.users.findByEmail(email);
    if (!user) return;

    // Only the latest link works.
    await this.prisma.passwordReset.deleteMany({ where: { userId: user.id, usedAt: null } });
    const token = randomBytes(32).toString('base64url');
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_LINK_MINUTES * 60 * 1000),
      },
    });
    const link = `${this.config.get('FRONTEND_URL', { infer: true })}/reset-password?token=${token}`;
    await this.mail.sendPasswordReset(user.email, user.name.split(' ')[0], link, language);
  }

  async resetPassword(token: string, password: string) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('INVALID_RESET_LINK');
    }
    await this.prisma.$transaction([
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash: await hashPassword(password) },
      }),
    ]);
    // Sign out every session opened with the old password.
    await this.tokens.revokeAll(reset.userId);
  }

  async changePassword(userId: string, current: string, next: string, refreshToken?: string) {
    await this.checkPassword(userId, current);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(next) },
    });
    // Other devices are signed out, this one stays signed in.
    await this.tokens.revokeAll(userId, refreshToken);
  }

  async deleteAccount(userId: string, password: string) {
    await this.checkPassword(userId, password);
    // Everything that belongs to the user is removed by the cascade.
    await this.prisma.user.delete({ where: { id: userId } });
  }

  // A wrong password here is a 400, not a 401: the user is signed in, and a
  // 401 would make the frontend think the session expired.
  private async checkPassword(userId: string, password: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (!(await argon2.verify(user.passwordHash, password))) {
      throw new BadRequestException('WRONG_PASSWORD');
    }
  }
}
