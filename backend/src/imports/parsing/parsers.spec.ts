import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBankStatement } from './bank-statement.parser.js';
import { parseCsv } from './csv.parser.js';
import { looksLikePayslip, parsePayslip } from './payslip.parser.js';
import { readPdfText } from './pdf-reader.js';
import { groupLines, toDay, toMillimes } from './text-layout.js';

// Fake documents with invented data, generated to mimic real layouts.
const sample = (name: string) =>
  readFileSync(join(import.meta.dirname, '../../../../samples', name));

describe('amount and date helpers', () => {
  it.each([
    ['985,637', 985637],
    ['1 308,952', 1308952],
    ['1.308,952', 1308952],
    ['-12,500', -12500],
    ['747,376 DT', 747376],
  ])('reads %s', (text, expected) => {
    expect(toMillimes(text)).toBe(expected);
  });

  it.each([
    ['05/03/2026', '2026-03-05'],
    ['05-03-26', '2026-03-05'],
    ['2026-03-05', '2026-03-05'],
    ['31/02/2026', null],
  ])('reads date %s', (text, expected) => {
    expect(toDay(text)).toBe(expected);
  });
});

describe('payslip PDF', () => {
  it('finds the month, net pay, gross, CNSS and IRPP', async () => {
    const [page] = await readPdfText(sample('fake-payslip.pdf'));
    const lines = groupLines(page);
    expect(looksLikePayslip(lines)).toBe(true);

    const { details, rows } = parsePayslip(lines);
    expect(details).toEqual({
      month: '2026-03',
      net: 747376,
      gross: 945500,
      cnss: 91524,
      irpp: 102400,
    });
    expect(rows).toEqual([
      { date: '2026-03-31', description: 'Salaire mars 2026', amount: 747376, type: 'INCOME' },
    ]);
  });
});

describe('bank statement PDF', () => {
  it('reads each operation with its side (debit or credit)', async () => {
    const pages = await readPdfText(sample('fake-bank-statement.pdf'));
    const lines = pages.map((p) => groupLines(p));
    expect(looksLikePayslip(lines[0])).toBe(false);

    const rows = parseBankStatement(lines);
    expect(rows).toHaveLength(8);
    expect(rows[0]).toEqual({
      date: '2026-03-02',
      description: 'VIR SALAIRE MARS SOCIETE EXEMPLE',
      amount: 747376,
      type: 'INCOME',
    });
    expect(rows[1]).toMatchObject({ description: 'ACHAT TPE CARREFOUR LA MARSA', amount: 86450, type: 'EXPENSE' });
    expect(rows[7]).toMatchObject({ amount: 1200000, type: 'INCOME' });
  });
});

describe('CSV', () => {
  it('guesses the columns and splits debit and credit', () => {
    const { headers, mapping, rows } = parseCsv(sample('fake-bank-statement.csv'));
    expect(headers).toEqual(['Date', 'Libellé', 'Débit', 'Crédit']);
    expect(mapping).toEqual({ date: 0, description: 1, amount: null, debit: 2, credit: 3 });
    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({ amount: 747376, type: 'INCOME' });
    expect(rows[1]).toMatchObject({ amount: 86450, type: 'EXPENSE' });
    expect(rows[5]).toMatchObject({ amount: 1200000, type: 'INCOME' });
  });

  it('handles a single signed amount column', () => {
    const csv = Buffer.from('date,description,amount\n2026-03-01,Coffee,-3.500\n2026-03-02,Refund,10.000\n');
    const { rows } = parseCsv(csv);
    expect(rows).toEqual([
      { date: '2026-03-01', description: 'Coffee', amount: 3500, type: 'EXPENSE' },
      { date: '2026-03-02', description: 'Refund', amount: 10000, type: 'INCOME' },
    ]);
  });
});
