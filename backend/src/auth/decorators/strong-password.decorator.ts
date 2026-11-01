import { applyDecorators } from '@nestjs/common';
import { IsString, Length, Matches } from 'class-validator';

// Same rules everywhere a password is chosen (and in the frontend).
export const IsStrongPassword = () =>
  applyDecorators(
    IsString(),
    Length(8, 128),
    Matches(/[A-Za-z]/, { message: 'password must contain a letter' }),
    Matches(/\d/, { message: 'password must contain a number' }),
  );
