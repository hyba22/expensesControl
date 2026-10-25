import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { BudgetsService } from '../budgets/budgets.service.js';
import { Categorizer, merchantKey } from './categorizer.js';
import { parseBankStatement } from './parsing/bank-statement.parser.js';
import { parseCsv } from './parsing/csv.parser.js';
import { looksLikePayslip, parsePayslip } from './parsing/payslip.parser.js';
import { hasText, readPdfText, readPdfWithOcr } from './parsing/pdf-reader.js';
import { groupLines } from './parsing/text-layout.js';
import type { CsvMapping, ParseResult } from './parsing/types.js';
import { ConfirmImportDto } from './dto/import.dto.js';

export type FileKind = 'csv' | 'pdf';

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categories: CategoriesService,
    private readonly budgets: BudgetsService,
  ) {}

  // Reads the file in memory (it is never stored) and returns rows for the
  // user to review, with a suggested category and a duplicate flag.
  async preview(userId: string, kind: FileKind, buffer: Buffer, mapping?: CsvMapping) {
    const result = kind === 'csv' ? this.readCsv(buffer, mapping) : await this.readPdf(buffer);
    if (result.rows.length === 0) {
      throw new BadRequestException(
        result.kind === 'payslip' ? 'NO_NET_PAY_FOUND' : 'NO_TRANSACTIONS_FOUND',
      );
    }

    const categorizer = await this.categorizerFor(userId);
    const duplicates = await this.findDuplicates(userId, result.rows);
    return {
      ...result,
      rows: result.rows.map((row) => ({
        ...row,
        categoryId: categorizer.suggest(row.description, row.type),
        duplicate: duplicates.has(`${row.date}|${row.amount}|${row.type}`),
      })),
    };
  }

  async confirm(userId: string, dto: ConfirmImportDto) {
    // Every category must belong to this user and match the row's type.
    const owned = await this.prisma.category.findMany({
      where: { userId },
      select: { id: true, type: true },
    });
    const types = new Map(owned.map((c) => [c.id, c.type]));
    for (const row of dto.rows) {
      if (row.categoryId && types.get(row.categoryId) !== row.type) {
        throw new BadRequestException('Unknown category');
      }
    }

    const data = dto.rows.map((row) => ({
        userId,
        type: row.type,
        amount: row.amount,
        date: new Date(row.date),
        description: row.description,
        note: row.note ?? null,
        categoryId: row.categoryId ?? null,
        source: dto.source,
      }));
    const { count } = await this.prisma.transaction.createMany({ data });
    const alerts = await this.budgets.alertsAfter(userId, data);
    return { created: count, alerts };
  }

  private readCsv(buffer: Buffer, mapping?: CsvMapping): ParseResult {
    const { headers, mapping: used, rows } = parseCsv(buffer, mapping);
    return { kind: 'csv', rows, csv: { headers, mapping: used }, ocr: false };
  }

  private async readPdf(buffer: Buffer): Promise<ParseResult> {
    let pages = await readPdfText(buffer);
    const ocr = !hasText(pages);
    // Scanned documents have no text layer: read them with OCR.
    if (ocr) pages = await readPdfWithOcr(buffer);
    const lines = pages.map((page) => groupLines(page, ocr ? 6 : 3));

    if (looksLikePayslip(lines[0] ?? [])) {
      const { details, rows } = parsePayslip(lines[0]);
      return { kind: 'payslip', rows, payslip: details, ocr };
    }
    return { kind: 'bank-statement', rows: parseBankStatement(lines), ocr };
  }

  private async categorizerFor(userId: string) {
    const [categories, history] = await Promise.all([
      this.categories.list(userId),
      this.prisma.transaction.findMany({
        where: { userId, categoryId: { not: null } },
        select: { description: true, categoryId: true },
        orderBy: { date: 'asc' },
        take: 2000,
      }),
    ]);
    // Later transactions overwrite earlier ones: the latest choice wins.
    const learned = new Map(
      history.map((t) => [merchantKey(t.description), t.categoryId as string]),
    );
    learned.delete('');
    return new Categorizer(categories, learned);
  }

  // Same day, same amount, same direction = probably already recorded.
  private async findDuplicates(userId: string, rows: { date: string }[]) {
    const dates = rows.map((r) => r.date).sort();
    const existing = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: new Date(dates[0]), lte: new Date(dates[dates.length - 1]) },
      },
      select: { date: true, amount: true, type: true },
    });
    return new Set(
      existing.map((t) => `${t.date.toISOString().slice(0, 10)}|${t.amount}|${t.type}`),
    );
  }
}
