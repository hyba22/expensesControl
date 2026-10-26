import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service.js';
import { TokensService } from './tokens.service.js';
import { CategoriesService } from '../categories/categories.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  // Used when the email is unknown, so a failed login takes the same time
  // whether or not the account exists (no account discovery by timing).
  private readonly dummyHash = argon2.hash('not-a-real-password');

  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokensService,
    private readonly categories: CategoriesService,
  ) {}

  async register(dto: RegisterDto, userAgent?: string) {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.users.create({
      email: dto.email,
      name: dto.name,
      currency: dto.currency,
      passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
    });
    await this.categories.ensureDefaults(user.id);
    const tokens = await this.tokens.issue(user, userAgent);
    return { user: this.users.toPublic(user), tokens };
  }

  async login(dto: LoginDto, userAgent?: string) {
    const user = await this.users.findByEmail(dto.email);
    const valid = await argon2.verify(
      user?.passwordHash ?? (await this.dummyHash),
      dto.password,
    );
    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const tokens = await this.tokens.issue(user, userAgent);
    return { user: this.users.toPublic(user), tokens };
  }

  async refresh(refreshToken: string, userAgent?: string) {
    const { user, tokens } = await this.tokens.rotate(refreshToken, userAgent);
    return { user: this.users.toPublic(user), tokens };
  }

  logout(refreshToken: string) {
    return this.tokens.revoke(refreshToken);
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.users.toPublic(user);
  }
}
