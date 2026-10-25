import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module.js';
import { BudgetsModule } from '../budgets/budgets.module.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';

@Module({
  imports: [CategoriesModule, BudgetsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
