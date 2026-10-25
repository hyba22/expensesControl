import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module.js';
import { BudgetsModule } from '../budgets/budgets.module.js';
import { ImportsController } from './imports.controller.js';
import { ImportsService } from './imports.service.js';

@Module({
  imports: [CategoriesModule, BudgetsModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
