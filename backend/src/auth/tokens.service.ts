import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Env } from '../config/env.js';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // Starts a new session (a new token "family") after login or sign-up.
  issue(user: { id: string; email: string }, userAgent?: string) {
    return this.create(user, randomUUID(), userAgent);
  }

  // Refresh tokens are single use: each refresh revokes the old token and
  // hands out a new one in the same family. If a revoked token is used again,
  // someone copied it, so the whole family (that device's session) is closed.
  async rotate(refreshToken: string, userAgent?: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash(refreshToken) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException();

    if (stored.revokedAt) {
      await this.revokeFamily(stored.family);
      throw new UnauthorizedException();
    }
    if (stored.expiresAt < new Date()) throw new UnauthorizedException();

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    // Another request rotated this token at the same moment.
    if (count === 0) throw new UnauthorizedException();

    const tokens = await this.create(stored.user, stored.family, userAgent);
    return { user: stored.user, tokens };
  }

  async revoke(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private revokeFamily(family: string) {
    return this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async create(
    user: { id: string; email: string },
    family: string,
    userAgent?: string,
  ): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });
    const refreshToken = randomBytes(48).toString('base64url');
    const days = this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true });
    const refreshExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hash(refreshToken),
        family,
        expiresAt: refreshExpiresAt,
        userAgent: userAgent?.slice(0, 255),
      },
    });
    return { accessToken, refreshToken, refreshExpiresAt };
  }
}
