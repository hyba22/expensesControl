import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { TokensService } from './tokens.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

interface Row {
  id: string;
  userId: string;
  tokenHash: string;
  family: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

// A tiny in-memory stand-in for the refreshToken table.
function fakePrisma() {
  const rows: Row[] = [];
  const user = { id: 'u1', email: 'a@b.c' };
  const matches = (row: Row, where: Partial<Row>) =>
    Object.entries(where).every(([k, v]) => row[k as keyof Row] === v);

  const refreshToken = {
    create: async ({ data }: { data: Omit<Row, 'id' | 'revokedAt'> }) => {
      const row = { ...data, id: `t${rows.length}`, revokedAt: null };
      rows.push(row);
      return row;
    },
    findUnique: async ({ where }: { where: { tokenHash: string } }) => {
      const row = rows.find((r) => r.tokenHash === where.tokenHash);
      return row ? { ...row, user } : null;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: Partial<Row>;
      data: Partial<Row>;
    }) => {
      const hit = rows.filter((r) => matches(r, where));
      hit.forEach((r) => Object.assign(r, data));
      return { count: hit.length };
    },
  };
  return { rows, prisma: { refreshToken } as unknown as PrismaService };
}

describe('TokensService', () => {
  let service: TokensService;
  let rows: Row[];

  beforeEach(() => {
    const fake = fakePrisma();
    rows = fake.rows;
    service = new TokensService(
      fake.prisma,
      new JwtService({ secret: 'x'.repeat(32) }),
      new ConfigService({ JWT_REFRESH_TTL_DAYS: 7 }) as never,
    );
  });

  it('stores only a hash of the refresh token', async () => {
    const { refreshToken } = await service.issue({ id: 'u1', email: 'a@b.c' });
    expect(rows[0].tokenHash).not.toBe(refreshToken);
    expect(rows[0].tokenHash).toBe(
      createHash('sha256').update(refreshToken).digest('hex'),
    );
  });

  it('rotates: the old token is revoked and a new one works', async () => {
    const first = await service.issue({ id: 'u1', email: 'a@b.c' });
    const { tokens: second } = await service.rotate(first.refreshToken);

    expect(rows[0].revokedAt).not.toBeNull();
    await expect(service.rotate(second.refreshToken)).resolves.toBeDefined();
  });

  it('closes the whole session when a used token is replayed', async () => {
    const first = await service.issue({ id: 'u1', email: 'a@b.c' });
    const { tokens: second } = await service.rotate(first.refreshToken);

    await expect(service.rotate(first.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    // The legitimate newer token is now revoked too.
    await expect(service.rotate(second.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects expired and unknown tokens', async () => {
    const { refreshToken } = await service.issue({ id: 'u1', email: 'a@b.c' });
    rows[0].expiresAt = new Date(Date.now() - 1000);

    await expect(service.rotate(refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.rotate('nope')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
