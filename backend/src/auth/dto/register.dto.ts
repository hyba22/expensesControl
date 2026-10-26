import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { CURRENCY_CODES } from '../../common/currencies.js';

export class RegisterDto {
  @ApiProperty({ example: 'Hiba' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 60)
  name: string;

  @ApiProperty({ example: 'hiba@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'Str0ngPassword', minLength: 8 })
  @IsString()
  @Length(8, 128)
  @Matches(/[A-Za-z]/, { message: 'password must contain a letter' })
  @Matches(/\d/, { message: 'password must contain a number' })
  password: string;

  @ApiPropertyOptional({ enum: CURRENCY_CODES, default: 'TND' })
  @IsOptional()
  @IsIn(CURRENCY_CODES)
  currency?: string;
}
