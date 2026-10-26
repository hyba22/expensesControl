import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';
import { AssistantService } from './assistant.service.js';

class MessageDto {
  @ApiProperty({ enum: ['user', 'assistant'] })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty()
  @IsString()
  @Length(1, 2000)
  content: string;
}

class ChatDto {
  @ApiProperty({ type: [MessageDto] })
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  messages: MessageDto[];

  @ApiProperty({ enum: ['fr', 'en'] })
  @IsIn(['fr', 'en'])
  language: 'fr' | 'en';
}

@ApiTags('assistant')
@ApiBearerAuth()
@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly assistant: AssistantService,
    private readonly users: UsersService,
  ) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.assistant.status(user.id);
  }

  // Streams the answer as server-sent events straight from Workers AI:
  // "data: {"response":"..."}" lines, ending with "data: [DONE]".
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('chat')
  async chat(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChatDto,
    @Res() res: Response,
  ) {
    const profile = await this.users.findById(user.id);
    const firstName = profile?.name.split(' ')[0] ?? '';
    // The last message must come from the user.
    const messages = dto.messages.slice(-12);
    if (messages[messages.length - 1].role !== 'user') messages.pop();

    const stream = await this.assistant.chat(
      { id: user.id, name: firstName, currency: profile?.currency ?? 'TND' },
      messages,
      dto.language,
    );
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    Readable.fromWeb(stream as never).pipe(res);
  }
}
