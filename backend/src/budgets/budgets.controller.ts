import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator.js';
import { SummaryQuery } from '../transactions/dto/transaction.dto.js';
import { BudgetsService } from './budgets.service.js';

class SetBudgetDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ description: 'Monthly limit in millimes', example: 300000 })
  @IsInt()
  @Min(1000)
  @Max(1_000_000_000)
  amount: number;
}

@ApiTags('budgets')
@ApiBearerAuth()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser, @Query() query: SummaryQuery) {
    return this.budgets.overview(user.id, query.month);
  }

  @Put()
  set(@CurrentUser() user: AuthUser, @Body() dto: SetBudgetDto) {
    return this.budgets.upsert(user.id, dto.categoryId, dto.amount);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.budgets.remove(user.id, id);
  }
}
