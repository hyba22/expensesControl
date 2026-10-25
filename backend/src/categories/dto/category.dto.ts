import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsString, Length } from 'class-validator';
import { TransactionType } from '../../generated/prisma/enums.js';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../category-style.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Gym' })
  @Transform(trim)
  @IsString()
  @Length(1, 40)
  name: string;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ enum: CATEGORY_ICONS })
  @IsIn(CATEGORY_ICONS)
  icon: string;

  @ApiProperty({ enum: CATEGORY_COLORS })
  @IsIn(CATEGORY_COLORS)
  color: string;
}

// The type can't change later: existing transactions depend on it.
export class UpdateCategoryDto extends PartialType(
  OmitType(CreateCategoryDto, ['type'] as const),
) {}
