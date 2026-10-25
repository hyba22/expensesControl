import { parse } from 'csv-parse/sync';
import { normalize, toDay, toMillimes } from './text-layout.js';
import type { CsvMapping, ParsedRow } from './types.js';

const MAX_ROWS = 2000;

// Picks the separator that splits the first line into the most columns.
function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  return [';', ',', '\t', '|'].reduce((best, candidate) =>
    firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best,
  );
}

function guessMapping(headers: string[]): CsvMapping {
  const find = (pattern: RegExp, except: (number | null)[] = []) => {
    const index = headers.findIndex(
      (h, i) => pattern.test(normalize(h)) && !except.includes(i),
    );
    return index === -1 ? null : index;
  };
  const date = find(/date\s*(d.)?op|^date$/) ?? find(/date/);
  const debit = find(/debit|retrait|sortie|depense/);
  const credit = find(/credit|versement|entree|recette/);
  return {
    date,
    description: find(/libell|descri|label|motif|detail|operation|narration|intitule/, [date]),
    amount: debit === null && credit === null ? find(/montant|amount|somme|valeur/) : null,
    debit,
    credit,
  };
}

export function parseCsv(buffer: Buffer, override?: CsvMapping) {
  // Bank exports are often in Windows-1252; fall back to it when the file is
  // not valid UTF-8.
  let text = new TextDecoder('utf-8').decode(buffer);
  if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buffer);
  text = text.replace(/^﻿/, '');

  const records: string[][] = parse(text, {
    delimiter: detectDelimiter(text),
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
    to: MAX_ROWS + 1,
  });

  // The header is the first line that has a "date"-like column.
  const headerIndex = Math.max(
    0,
    records.findIndex((r) => r.some((cell) => /date/.test(normalize(cell)))),
  );
  const headers = records[headerIndex] ?? [];
  const mapping = override ?? guessMapping(headers);

  const rows: ParsedRow[] = [];
  for (const record of records.slice(headerIndex + 1)) {
    const cell = (index: number | null) => (index === null ? '' : (record[index] ?? ''));
    const date = toDay(cell(mapping.date));
    if (!date) continue;

    let signed: number | null = null;
    if (mapping.amount !== null) {
      signed = toMillimes(cell(mapping.amount));
    } else {
      const debit = toMillimes(cell(mapping.debit)) ?? 0;
      const credit = toMillimes(cell(mapping.credit)) ?? 0;
      signed = credit ? Math.abs(credit) : debit ? -Math.abs(debit) : null;
    }
    if (!signed) continue;

    rows.push({
      date,
      description: cell(mapping.description).slice(0, 120) || 'Opération',
      amount: Math.abs(signed),
      type: signed > 0 ? 'INCOME' : 'EXPENSE',
    });
  }
  return { headers, mapping, rows };
}
