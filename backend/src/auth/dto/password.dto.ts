import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../decorators/strong-password.decorator.js';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'hiba@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: ['fr', 'en'] })
  @IsOptional()
  @IsIn(['fr', 'en'])
  language?: 'fr' | 'en';
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @Length(20, 200)
  token: string;

  @ApiProperty()
  @IsStrongPassword()
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  currentPassword: string;

  @ApiProperty()
  @IsStrongPassword()
  newPassword: string;
}

export class DeleteAccountDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  password: string;
}
