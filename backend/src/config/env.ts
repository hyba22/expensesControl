import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_ACCESS_TTL = '15m';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  JWT_REFRESH_TTL_DAYS: number = 7;

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string;

  @IsIn(['lax', 'strict', 'none'])
  COOKIE_SAMESITE: 'lax' | 'strict' | 'none' = 'lax';

  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @Type(() => Number)
  @IsInt()
  PORT: number = 3000;

  // AI assistant (Cloudflare Workers AI). Optional: without a token the
  // assistant says it is not configured and the rest of the app works.
  @IsOptional()
  @IsString()
  CLOUDFLARE_ACCOUNT_ID?: string;

  @IsOptional()
  @IsString()
  CLOUDFLARE_AI_TOKEN?: string;

  @IsString()
  AI_MODEL: string = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  AI_DAILY_LIMIT: number = 30;
}

export type Env = EnvironmentVariables;

// Fails fast at startup when a required setting is missing or invalid.
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment:\n${errors.toString()}`);
  }
  return validated;
}
