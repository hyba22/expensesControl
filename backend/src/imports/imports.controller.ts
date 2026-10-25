import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../auth/decorators/current-user.decorator.js';
import { ImportsService, type FileKind } from './imports.service.js';
import { ConfirmImportDto } from './dto/import.dto.js';
import type { CsvMapping } from './parsing/types.js';

const MAX_SIZE = 5 * 1024 * 1024;

// Trust the file's content, not its name: a PDF starts with "%PDF-", and a
// CSV is plain text without null bytes.
function detectKind(file: Express.Multer.File): FileKind {
  const name = file.originalname.toLowerCase();
  if (name.endsWith('.pdf') && file.buffer.subarray(0, 5).toString() === '%PDF-') {
    return 'pdf';
  }
  if (/\.(csv|txt)$/.test(name) && !file.buffer.subarray(0, 4096).includes(0)) {
    return 'csv';
  }
  throw new BadRequestException('UNSUPPORTED_FILE');
}

function parseMapping(raw: unknown): CsvMapping | undefined {
  if (typeof raw !== 'string' || !raw) return undefined;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const field = (key: string) => {
      const v = value[key];
      return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 100 ? v : null;
    };
    return {
      date: field('date'),
      description: field('description'),
      amount: field('amount'),
      debit: field('debit'),
      credit: field('credit'),
    };
  } catch {
    throw new BadRequestException('Invalid mapping');
  }
}

@ApiTags('imports')
@ApiBearerAuth()
@Controller('imports')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  // Reading scanned PDFs with OCR is heavy, so this route has a lower limit.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('preview')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        mapping: { type: 'string', description: 'CSV column mapping as JSON' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SIZE, files: 1 } }))
  preview(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('mapping') mapping: unknown,
  ) {
    if (!file) throw new BadRequestException('UNSUPPORTED_FILE');
    return this.imports.preview(user.id, detectKind(file), file.buffer, parseMapping(mapping));
  }

  @Post('confirm')
  confirm(@CurrentUser() user: AuthUser, @Body() dto: ConfirmImportDto) {
    return this.imports.confirm(user.id, dto);
  }
}
