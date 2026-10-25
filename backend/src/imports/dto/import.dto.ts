import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsIn, ValidateNested } from 'class-validator';
import { CreateTransactionDto } from '../../transactions/dto/transaction.dto.js';

export class ConfirmImportDto {
  @ApiProperty({ enum: ['CSV', 'PDF'] })
  @IsIn(['CSV', 'PDF'])
  source: 'CSV' | 'PDF';

  @ApiProperty({ type: [CreateTransactionDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  rows: CreateTransactionDto[];
}
