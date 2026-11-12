import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { TokensService } from './tokens.service.js';
import { DEMO_BUDGETS, buildDemoTransactions } from './demo-data.js';

const DEMO_LIFETIME_HOURS = 24;

// Every visitor of the live demo gets their own account with sample data, so
// nobody sees what someone else changed. Old demo accounts are cleaned up here.
@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly categories: CategoriesService,
    private readonly tokens: TokensService,
  ) {}

  async start(userAgent?: string) {
    await this.prisma.user.deleteMany({
      where: {
        isDemo: true,
        createdAt: { lt: new Date(Date.now() - DEMO_LIFETIME_HOURS * 60 * 60 * 1000) },
      },
    });

    const user = await this.users.create({
      // .invalid can never receive mail.
      email: `demo-${randomBytes(6).toString('hex')}@demo.invalid`,
      name: 'Amira Ben Salah',
      currency: 'TND',
      // Nobody knows this password: the demo is only opened through this route.
      passwordHash: await argon2.hash(randomBytes(32).toString('base64url'), { type: argon2.argon2id }),
      isDemo: true,
    });
    await this.categories.ensureDefaults(user.id);

    const categories = await this.prisma.category.findMany({
      where: { userId: user.id },
      select: { id: true, key: true },
    });
    const idOf = new Map(categories.map((c) => [c.key, c.id]));

    await this.prisma.transaction.createMany({
      data: buildDemoTransactions(new Date()).map(({ category, ...row }) => ({
        ...row,
        userId: user.id,
        categoryId: idOf.get(category),
      })),
    });
    await this.prisma.budget.createMany({
      data: Object.entries(DEMO_BUDGETS).map(([key, amount]) => ({
        userId: user.id,
        categoryId: idOf.get(key)!,
        amount,
      })),
    });

    const tokens = await this.tokens.issue(user, userAgent);
    return { user: this.users.toPublic(user), tokens };
  }
}
