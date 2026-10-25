import {
  isAmount,
  normalize,
  toDay,
  toMillimes,
  type Line,
} from './text-layout.js';
import type { ParsedRow } from './types.js';

interface Columns {
  debit: number;
  credit: number;
}

// Finds the "Débit" / "Crédit" column headers to know which side an amount
// is on.
function findColumns(lines: Line[]): Columns | null {
  for (const line of lines) {
    const debit = line.items.find((i) => /^d[eé]bits?\b/i.test(normalize(i.text)));
    const credit = line.items.find((i) => /^cr[eé]dits?\b/i.test(normalize(i.text)));
    if (debit && credit) {
      return { debit: debit.x + debit.width / 2, credit: credit.x + credit.width / 2 };
    }
  }
  return null;
}

// Reads bank statement lines: a date first, a label, and an amount in the
// debit or credit column. Pages are read one by one because the column
// positions can change between pages.
export function parseBankStatement(pages: Line[][]): ParsedRow[] {
  const rows: ParsedRow[] = [];
  let columns: Columns | null = null;

  for (const lines of pages) {
    columns = findColumns(lines) ?? columns;
    let current: ParsedRow | null = null;

    for (const line of lines) {
      const [first] = line.items;
      const date = first ? toDay(first.text) : null;
      const text = normalize(line.text);

      if (!date) {
        // A label that continues on the next line.
        const extra = line.items.filter((i) => !isAmount(i.text) && !toDay(i.text));
        if (current && extra.length && !/solde|total/.test(text) && current.description.length < 80) {
          current.description += ` ${extra.map((i) => i.text).join(' ')}`;
        }
        continue;
      }
      current = null;
      if (/solde|report|total/.test(text)) continue;

      const amounts = line.items.filter((i) => isAmount(i.text));
      if (amounts.length === 0) continue;
      const label = line.items
        .slice(1)
        .filter((i) => !isAmount(i.text) && !toDay(i.text))
        .map((i) => i.text)
        .join(' ')
        .trim();

      // With columns: the amount closest to "Débit" or "Crédit". Without, we
      // guess an expense; the user can flip it in the preview.
      const value = amounts[0];
      const millimes = toMillimes(value.text);
      if (!millimes) continue;
      let type: ParsedRow['type'] = 'EXPENSE';
      if (columns) {
        const center = value.x + value.width / 2;
        if (Math.abs(center - columns.credit) < Math.abs(center - columns.debit)) {
          type = 'INCOME';
        }
      }

      current = {
        date,
        description: label || 'Opération',
        amount: Math.abs(millimes),
        type,
      };
      rows.push(current);
    }
  }
  return rows;
}
