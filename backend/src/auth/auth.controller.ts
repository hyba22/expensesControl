import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import type { IssuedTokens } from './tokens.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Public } from './decorators/public.decorator.js';
import {
  CurrentUser,
  type AuthUser,
} from './decorators/current-user.decorator.js';
import type { Env } from '../config/env.js';

const REFRESH_COOKIE = 'ft_refresh';

// Strict limits on the endpoints attackers would brute-force.
const AUTH_LIMIT = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Throttle(AUTH_LIMIT)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.register(dto, userAgent);
    return this.respond(res, user, tokens);
  }

  @Public()
  @Throttle(AUTH_LIMIT)
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.login(dto, userAgent);
    return this.respond(res, user, tokens);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.requireAjaxHeader(req);
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) throw new UnauthorizedException();
    try {
      const { user, tokens } = await this.auth.refresh(
        token,
        req.headers['user-agent'],
      );
      return this.respond(res, user, tokens);
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
      throw error;
    }
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.requireAjaxHeader(req);
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) await this.auth.logout(token);
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  private respond(
    res: Response,
    user: unknown,
    { accessToken, refreshToken, refreshExpiresAt }: IssuedTokens,
  ) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...this.cookieOptions(),
      expires: refreshExpiresAt,
    });
    return { user, accessToken };
  }

  // The refresh token lives in an httpOnly cookie: page scripts can't read
  // it, and the browser only sends it to the auth routes.
  private cookieOptions(): CookieOptions {
    const sameSite = this.config.get('COOKIE_SAMESITE', { infer: true });
    return {
      httpOnly: true,
      secure:
        sameSite === 'none' ||
        this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite,
      path: '/api/auth',
    };
  }

  // Cookie-based routes need a custom header. Browsers only let other sites
  // send it after a CORS check, which blocks cross-site request forgery.
  private requireAjaxHeader(req: Request) {
    if (req.headers['x-requested-with'] !== 'fetch') {
      throw new ForbiddenException();
    }
  }
}
