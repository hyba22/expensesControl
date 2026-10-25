import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { BudgetsService } from '../budgets/budgets.service.js';
import { monthRange, shiftMonth } from '../common/months.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  CreateTransactionDto,
  ListTransactionsQuery,
  UpdateTransactionDto,
} from './dto/transaction.dto.js';

const withCategory = { category: true } as const;


@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    private readonly budgets: BudgetsService,
  ) {}

  async list(userId: string, query: ListTransactionsQuery) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      type: query.type,
      date: {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      },
      ...(query.categoryId && {
        categoryId: query.categoryId === 'none' ? null : query.categoryId,
      }),
      ...(query.search && {
        description: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [items, total, sums] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: withCategory,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where,
        orderBy: { type: 'asc' },
        _sum: { amount: true },
      }),
    ]);

    const sumOf = (type: string) =>
      sums.find((s) => s.type === type)?._sum?.amount ?? 0;
    return {
      items,
      total,
      totals: { income: sumOf('INCOME'), expense: sumOf('EXPENSE') },
    };
  }

  async create(userId: string, dto: CreateTransactionDto) {
    if (dto.categoryId) {
      await this.categories.assertUsable(userId, dto.categoryId, dto.type);
    }
    const transaction = await this.prisma.transaction.create({
      data: { ...dto, date: new Date(dto.date), userId },
      include: withCategory,
    });
    // Tell the user right away if this expense pushed a budget past 80/100 %.
    const alerts = await this.budgets.alertsAfter(userId, [transaction]);
    return { ...transaction, alerts };
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const current = await this.findOwned(userId, id);
    const type = dto.type ?? current.type;
    const categoryId =
      dto.categoryId === undefined ? current.categoryId : dto.categoryId;
    if (categoryId) await this.categories.assertUsable(userId, categoryId, type);

    return this.prisma.transaction.update({
      where: { id },
      data: { ...dto, ...(dto.date && { date: new Date(dto.date) }) },
      include: withCategory,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    await this.prisma.transaction.delete({ where: { id } });
  }

  // Dashboard numbers: all-time balance, this month's spending, what is left
  // to spend, spending per category, and the latest transactions.
  //
  // In Tunisia salaries arrive at the end of the month and pay for the next
  // one, so "left to spend" in a month = income received the month before
  // minus what was spent this month.
  async summary(userId: string, month: string) {
    const range = monthRange(month);
    const [allTime, thisMonth, byCategory, recent, lastMonthIncome] =
      await this.prisma.$transaction([
        this.prisma.transaction.groupBy({
          by: ['type'],
          where: { userId },
          orderBy: { type: 'asc' },
          _sum: { amount: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['type'],
          where: { userId, date: range },
          orderBy: { type: 'asc' },
          _sum: { amount: true },
        }),
        this.prisma.transaction.groupBy({
          by: ['categoryId'],
          where: { userId, type: 'EXPENSE', date: range },
          orderBy: { _sum: { amount: 'desc' } },
          _sum: { amount: true },
        }),
        this.prisma.transaction.findMany({
          where: { userId },
          include: withCategory,
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: 5,
        }),
        this.prisma.transaction.aggregate({
          where: { userId, type: 'INCOME', date: monthRange(shiftMonth(month, -1)) },
          _sum: { amount: true },
        }),
      ]);

    const sum = (rows: typeof allTime, type: string) =>
      rows.find((r) => r.type === type)?._sum?.amount ?? 0;
    const available = lastMonthIncome._sum.amount ?? 0;
    return {
      balance: sum(allTime, 'INCOME') - sum(allTime, 'EXPENSE'),
      income: sum(thisMonth, 'INCOME'),
      expense: sum(thisMonth, 'EXPENSE'),
      available,
      remaining: available - sum(thisMonth, 'EXPENSE'),
      byCategory: byCategory.map((row) => ({
        categoryId: row.categoryId,
        amount: row._sum?.amount ?? 0,
      })),
      recent,
    };
  }

  private async findOwned(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }
}
