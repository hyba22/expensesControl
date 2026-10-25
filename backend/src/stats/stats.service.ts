import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { merchantKey } from '../imports/categorizer.js';
import { daysIn, monthOf, monthRange, shiftMonth } from '../common/months.js';

const MONTHS_SHOWN = 6;

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  // Everything the Statistics page draws, for one month.
  async forMonth(userId: string, month: string) {
    const first = shiftMonth(month, -(MONTHS_SHOWN - 1));
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: monthRange(first).gte, lt: monthRange(month).lt },
      },
      select: { date: true, amount: true, type: true, categoryId: true, description: true },
    });

    const previous = shiftMonth(month, -1);
    const expenses = (m: string) =>
      transactions.filter((t) => t.type === 'EXPENSE' && monthOf(t.date) === m);

    // Last 6 months: money in and out.
    const monthly = Array.from({ length: MONTHS_SHOWN }, (_, i) => {
      const m = shiftMonth(first, i);
      const inMonth = transactions.filter((t) => monthOf(t.date) === m);
      const sum = (type: string) =>
        inMonth.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
      return { month: m, income: sum('INCOME'), expense: sum('EXPENSE') };
    });

    // Spending piling up day by day, this month and last month.
    const cumulative = (m: string) => {
      const perDay = new Array<number>(daysIn(m)).fill(0);
      for (const t of expenses(m)) perDay[t.date.getUTCDate() - 1] += t.amount;
      let running = 0;
      return perDay.map((v) => (running += v));
    };

    const byCategory = new Map<string | null, number>();
    const merchants = new Map<string, { name: string; amount: number; count: number }>();
    for (const t of expenses(month)) {
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amount);
      const key = merchantKey(t.description) || t.description.toLowerCase();
      const merchant = merchants.get(key) ?? { name: t.description, amount: 0, count: 0 };
      merchant.amount += t.amount;
      merchant.count += 1;
      merchants.set(key, merchant);
    }

    return {
      month,
      monthly,
      daily: { current: cumulative(month), previous: cumulative(previous) },
      byCategory: [...byCategory]
        .map(([categoryId, amount]) => ({ categoryId, amount }))
        .sort((a, b) => b.amount - a.amount),
      topMerchants: [...merchants.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
    };
  }
}
