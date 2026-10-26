import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BudgetsService } from '../budgets/budgets.service.js';
import { StatsService } from '../stats/stats.service.js';
import { currentMonth, monthRange, shiftMonth } from '../common/months.js';
import { formatMoney } from '../common/currencies.js';

// Built-in category names, so answers use the same words as the app.
const DEFAULT_NAMES: Record<'fr' | 'en', Record<string, string>> = {
  fr: {
    groceries: 'Courses', restaurants: 'Restaurants & cafés', transport: 'Transport', fuel: 'Carburant',
    rent: 'Loyer', bills: 'Factures (STEG, SONEDE)', phone_internet: 'Téléphone & internet', health: 'Santé',
    shopping: 'Shopping', leisure: 'Loisirs', education: 'Éducation', family: 'Famille',
    other_expense: 'Autres dépenses', salary: 'Salaire', bonus: 'Prime', freelance: 'Freelance', other_income: 'Autres revenus',
  },
  en: {
    groceries: 'Groceries', restaurants: 'Restaurants & cafés', transport: 'Transport', fuel: 'Fuel',
    rent: 'Rent', bills: 'Bills (STEG, SONEDE)', phone_internet: 'Phone & internet', health: 'Health',
    shopping: 'Shopping', leisure: 'Leisure', education: 'Education', family: 'Family',
    other_expense: 'Other expenses', salary: 'Salary', bonus: 'Bonus', freelance: 'Freelance', other_income: 'Other income',
  },
};

// A compact, plain-text picture of the user's finances that the assistant
// reads before answering. Only aggregates and recent transactions: no ids,
// no email, nothing it doesn't need.
@Injectable()
export class FinancialContext {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgets: BudgetsService,
    private readonly stats: StatsService,
  ) {}

  async build(userId: string, language: 'fr' | 'en', currency: string) {
    const money = (amount: number) => formatMoney(amount, currency);
    const month = currentMonth();
    const [categories, totals, lastMonthIncome, stats, budgetOverview, recent] =
      await Promise.all([
        this.prisma.category.findMany({ where: { userId } }),
        this.prisma.transaction.groupBy({
          by: ['type'],
          where: { userId },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: { userId, type: 'INCOME', date: monthRange(shiftMonth(month, -1)) },
          _sum: { amount: true },
        }),
        this.stats.forMonth(userId, month),
        this.budgets.overview(userId, month),
        this.prisma.transaction.findMany({
          where: { userId },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: 20,
          include: { category: true },
        }),
      ]);

    const name = (id: string | null) => {
      const c = categories.find((x) => x.id === id);
      if (!c) return language === 'fr' ? 'Sans catégorie' : 'Uncategorized';
      return c.name ?? DEFAULT_NAMES[language][c.key ?? ''] ?? c.key ?? '';
    };
    const sum = (type: string) => totals.find((t) => t.type === type)?._sum.amount ?? 0;
    const spent = stats.monthly[stats.monthly.length - 1]?.expense ?? 0;
    const available = lastMonthIncome._sum.amount ?? 0;
    const day = new Date().getUTCDate();

    const lines = [
      `Today: ${new Date().toISOString().slice(0, 10)} (day ${day} of ${stats.daily.current.length} of the month ${month}).`,
      `Overall balance (all income minus all expenses): ${money(sum('INCOME') - sum('EXPENSE'))}.`,
      `Money for this month (income received last month): ${money(available)}. Spent this month: ${money(spent)}. Left to spend: ${money(available - spent)}.`,
      `Spent by the same day last month: ${money(stats.daily.previous[Math.min(day, stats.daily.previous.length) - 1] ?? 0)}.`,
      '',
      'Spending this month by category:',
      ...(stats.byCategory.length
        ? stats.byCategory.map((c) => `- ${name(c.categoryId)}: ${money(c.amount)}`)
        : ['- none yet']),
      '',
      'Monthly budgets (limit / spent this month):',
      ...(budgetOverview.budgets.length
        ? budgetOverview.budgets.map(
            (b) => `- ${name(b.categoryId)}: ${money(b.amount)} / ${money(b.spent)} (${Math.round((b.spent / b.amount) * 100)}%)`,
          )
        : ['- no budgets set']),
      '',
      'Last 6 months (income / expenses):',
      ...stats.monthly.map((m) => `- ${m.month}: ${money(m.income)} / ${money(m.expense)}`),
      '',
      'Top places this month:',
      ...(stats.topMerchants.length
        ? stats.topMerchants.map((m) => `- ${m.name.slice(0, 50)}: ${money(m.amount)} (${m.count}x)`)
        : ['- none']),
      '',
      'Latest transactions:',
      ...recent.map(
        (t) =>
          `- ${t.date.toISOString().slice(0, 10)} ${t.type === 'INCOME' ? '+' : '-'}${money(t.amount)} "${t.description.slice(0, 60)}" [${name(t.categoryId)}]`,
      ),
    ];
    return lines.join('\n');
  }
}
