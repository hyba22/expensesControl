import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_CATEGORIES } from './category-style.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import type { TransactionType } from '../generated/prisma/enums.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Gives every user the built-in categories. Safe to call again: existing
  // ones are skipped thanks to the unique (userId, key) index.
  async ensureDefaults(userId: string) {
    await this.prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
      skipDuplicates: true,
    });
  }

  async list(userId: string) {
    const count = await this.prisma.category.count({ where: { userId } });
    if (count === 0) await this.ensureDefaults(userId);

    return this.prisma.category.findMany({
      where: { userId },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { transactions: true } } },
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    await this.assertNameFree(userId, dto.type, dto.name);
    return this.prisma.category.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOwned(userId, id);
    if (dto.name !== undefined) {
      await this.assertNameFree(userId, category.type, dto.name, id);
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    // Its transactions are kept and become uncategorized (onDelete: SetNull).
    await this.prisma.category.delete({ where: { id } });
  }

  // Every lookup is filtered by user, so ids from other accounts look like
  // they don't exist.
  async findOwned(userId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async assertUsable(userId: string, id: string, type: TransactionType) {
    const category = await this.findOwned(userId, id);
    if (category.type !== type) {
      throw new BadRequestException('Category type does not match');
    }
  }

  private async assertNameFree(
    userId: string,
    type: TransactionType,
    name: string,
    exceptId?: string,
  ) {
    const clash = await this.prisma.category.findFirst({
      where: {
        userId,
        type,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId && { id: { not: exceptId } }),
      },
    });
    if (clash) throw new ConflictException('Category name already used');
  }
}
