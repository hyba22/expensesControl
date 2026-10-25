import type { TransactionType } from '../../generated/prisma/enums.js';

// A transaction read from a file, before the user reviews it.
export interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
}

export interface PayslipDetails {
  month: string | null;
  net: number | null;
  gross: number | null;
  cnss: number | null;
  irpp: number | null;
}

export type DocumentKind = 'csv' | 'bank-statement' | 'payslip';

export interface ParseResult {
  kind: DocumentKind;
  rows: ParsedRow[];
  payslip?: PayslipDetails;
  csv?: { headers: string[]; mapping: CsvMapping };
  ocr: boolean;
}

// Which CSV column holds what (column indexes).
export interface CsvMapping {
  date: number | null;
  description: number | null;
  amount: number | null;
  debit: number | null;
  credit: number | null;
}
