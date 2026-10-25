import { Module } from '@nestjs/common';
import { BudgetsModule } from '../budgets/budgets.module.js';
import { StatsModule } from '../stats/stats.module.js';
import { UsersModule } from '../users/users.module.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';
import { FinancialContext } from './financial-context.js';

@Module({
  imports: [BudgetsModule, StatsModule, UsersModule],
  controllers: [AssistantController],
  providers: [AssistantService, FinancialContext],
})
export class AssistantModule {}
