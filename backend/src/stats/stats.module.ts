import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator.js';
import { SummaryQuery } from '../transactions/dto/transaction.dto.js';
import { StatsService } from './stats.service.js';

@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  forMonth(@CurrentUser() user: AuthUser, @Query() query: SummaryQuery) {
    return this.stats.forMonth(user.id, query.month);
  }
}

@Module({
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
