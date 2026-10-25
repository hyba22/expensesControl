import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { monthOf, monthRange, shiftMonth } from '../common/months.js';

export interface BudgetAlert {
  categoryId: string;
  percent: number;
  level: 80 | 100;
}

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
  ) {}

  // Each budget with what was spent in that category during the month, plus
  // a suggested amount for every expense category: the average of the last
  // 3 full months.
  async overview(userId: string, month: string) {
    const [budgets, spent, history] = await Promise.all([
      this.prisma.budget.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.spentByCategory(userId, monthRange(month)),
      this.spentByCategory(userId, {
        gte: monthRange(shiftMonth(month, -3)).gte,
        lt: monthRange(month).gte,
      }),
    ]);
    return {
      budgets: budgets.map((b) => ({
        id: b.id,
        categoryId: b.categoryId,
        amount: b.amount,
        spent: spent.get(b.categoryId) ?? 0,
      })),
      suggestions: Object.fromEntries(
        [...history].map(([categoryId, total]) => [
          categoryId,
          Math.round(total / 3 / 1000) * 1000,
        ]),
      ),
    };
  }

  async upsert(userId: string, categoryId: string, amount: number) {
    const category = await this.categories.findOwned(userId, categoryId);
    if (category.type !== 'EXPENSE') {
      throw new BadRequestException('Budgets are for expense categories');
    }
    return this.prisma.budget.upsert({
      where: { userId_categoryId: { userId, categoryId } },
      create: { userId, categoryId, amount },
      update: { amount },
    });
  }

  async remove(userId: string, id: string) {
    const { count } = await this.prisma.budget.deleteMany({ where: { id, userId } });
    if (count === 0) throw new NotFoundException('Budget not found');
  }

  // Called after new expenses are saved: which budgets just crossed 80 % or
  // 100 % of their limit because of them.
  async alertsAfter(
    userId: string,
    added: { categoryId: string | null; date: Date; amount: number; type: string }[],
  ): Promise<BudgetAlert[]> {
    const groups = new Map<string, { categoryId: string; month: string; amount: number }>();
    for (const t of added) {
      if (t.type !== 'EXPENSE' || !t.categoryId) continue;
      const key = `${t.categoryId}|${monthOf(t.date)}`;
      const group = groups.get(key) ?? { categoryId: t.categoryId, month: monthOf(t.date), amount: 0 };
      group.amount += t.amount;
      groups.set(key, group);
    }
    if (groups.size === 0) return [];

    const budgets = await this.prisma.budget.findMany({
      where: { userId, categoryId: { in: [...groups.values()].map((g) => g.categoryId) } },
    });
    const alerts: BudgetAlert[] = [];
    for (const group of groups.values()) {
      const budget = budgets.find((b) => b.categoryId === group.categoryId);
      if (!budget) continue;
      const total = await this.prisma.transaction.aggregate({
        where: { userId, categoryId: group.categoryId, type: 'EXPENSE', date: monthRange(group.month) },
        _sum: { amount: true },
      });
      const after = total._sum.amount ?? 0;
      const before = after - group.amount;
      for (const level of [100, 80] as const) {
        const limit = (budget.amount * level) / 100;
        if (before < limit && after >= limit) {
          alerts.push({
            categoryId: group.categoryId,
            percent: Math.round((after / budget.amount) * 100),
            level,
          });
          break;
        }
      }
    }
    return alerts;
  }

  private async spentByCategory(userId: string, date: { gte: Date; lt: Date }) {
    const rows = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'EXPENSE', date, categoryId: { not: null } },
      _sum: { amount: true },
    });
    return new Map(rows.map((r) => [r.categoryId as string, r._sum.amount ?? 0]));
  }
}
