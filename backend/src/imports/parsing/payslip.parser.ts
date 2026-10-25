import {
  isAmount,
  normalize,
  toMillimes,
  type Line,
  type TextItem,
} from './text-layout.js';
import type { ParsedRow, PayslipDetails } from './types.js';

const MONTHS = [
  'janvier',
  'fevrier',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'aout',
  'septembre',
  'octobre',
  'novembre',
  'decembre',
];

// When the column headers can't be read (scans often lose them), find the
// deduction by its math: on a line "base, rate %, amount, employer rate %,
// employer amount", the employee deduction is base x rate. The employee rate
// comes first, left to right. Otherwise, an amount printed several times on
// the line (IRPP: base = deduction), or the last one.
function deductionWithoutHeader(values: number[]) {
  for (let i = 1; i < values.length; i++) {
    const rate = values[i];
    if (rate <= 0 || rate > 40_000) continue; // rates are below 40 %
    const base = Math.max(...values.slice(0, i));
    const expected = (base * rate) / 100_000;
    const match = values
      .slice(i + 1)
      .find((v) => Math.abs(v - expected) <= Math.max(2, expected * 0.01));
    if (match !== undefined) return match;
  }
  const repeated = values.find((v, i) => values.indexOf(v) !== i);
  return repeated ?? values[values.length - 1];
}

export function looksLikePayslip(lines: Line[]) {
  const text = normalize(lines.map((l) => l.text).join(' '));
  return /bulletin de (paie|salaire)|fiche de paie|net\s*a\s*payer/.test(text);
}

// Reads a Tunisian payslip ("bulletin de paie"): pay month, net to pay,
// gross salary, CNSS and IRPP deductions. Values are found by position, near
// their labels, so it works across payroll software layouts.
export function parsePayslip(lines: Line[]): {
  details: PayslipDetails;
  rows: ParsedRow[];
} {
  const items = lines.flatMap((l) => l.items.map((i) => ({ ...i, y: l.y })));
  const amounts = items.filter((i) => isAmount(i.text));

  // Labels can be one item ("NET A PAYER") or several words, as OCR returns
  // them ("NET" "A" "PAYER"), with stray punctuation in between. Returns the
  // position of the label's first word.
  const find = (pattern: RegExp): TextItem | undefined => {
    for (const line of lines) {
      const words = line.items.filter((i) => /[\p{L}\d]/u.test(i.text));
      for (let start = 0; start < words.length; start++) {
        const phrase = normalize(
          words
            .slice(start, start + 4)
            .map((w) => w.text)
            .join(' '),
        );
        if (pattern.test(phrase)) return { ...words[start], y: line.y };
      }
    }
    return undefined;
  };

  // The value for a label is the closest amount on the same line to its
  // right, or just below it.
  const valueNear = (label: TextItem | undefined) => {
    if (!label) return null;
    let best: { item: TextItem; score: number } | null = null;
    for (const item of amounts) {
      const dy = item.y - label.y;
      const dx = item.x - label.x;
      const sameLine = Math.abs(dy) <= 3 && dx > 0;
      const below = dy > 3 && dy < 60 && Math.abs(dx) < 120;
      if (!sameLine && !below) continue;
      const score = sameLine ? dx : dy * 3 + Math.abs(dx);
      if (!best || score < best.score) best = { item, score };
    }
    return best ? toMillimes(best.item.text) : null;
  };

  // For table rows (CNSS, IRPP) the deduction sits in the employee
  // "Retenue" column: the first "Retenue" after "Gain" on the header line.
  const headerLine = lines.find((l) => /\bgain\b.*\bretenue\b/.test(normalize(l.text)));
  const gainIndex = headerLine?.items.findIndex((i) => /^gain/.test(normalize(i.text))) ?? -1;
  const retenueHeader = headerLine?.items
    .slice(gainIndex + 1)
    .find((i) => /^retenue/.test(normalize(i.text)));
  const deduction = (pattern: RegExp) => {
    const line = lines.find((l) => pattern.test(normalize(l.text)));
    if (!line) return null;
    const values = line.items.filter((i) => isAmount(i.text));
    if (values.length === 0) return null;
    if (retenueHeader) {
      const target = retenueHeader.x;
      const closest = values.reduce((a, b) =>
        Math.abs(b.x - target) < Math.abs(a.x - target) ? b : a,
      );
      return toMillimes(closest.text);
    }
    return deductionWithoutHeader(values.map((v) => toMillimes(v.text) ?? 0));
  };

  const fullText = normalize(lines.map((l) => l.text).join(' '));
  const monthMatch = new RegExp(`(${MONTHS.join('|')})\\s+(20\\d{2})`).exec(
    fullText,
  );
  const month = monthMatch
    ? `${monthMatch[2]}-${String(MONTHS.indexOf(monthMatch[1]) + 1).padStart(2, '0')}`
    : null;

  const details: PayslipDetails = {
    month,
    // "Salaire net" in the totals table is the same amount, and a fallback
    // when the "NET A PAYER" box can't be read.
    net:
      valueNear(find(/^net\s*a\s*payer/)) ??
      valueNear(find(/^salaire\s+(\w\s+)?net\b/)),
    gross:
      valueNear(find(/^salaire\s+(\w\s+)?brut\b/)) ??
      valueNear(find(/^total\s*brut/)),
    cnss: deduction(/^retenue\s*c\.?\s*n\.?\s*s\.?\s*s/),
    irpp: deduction(/^irpp/),
  };

  const rows: ParsedRow[] = [];
  if (details.net && details.net > 0) {
    // Salaries are paid at the end of the month they cover.
    const [year, m] = (month ?? new Date().toISOString().slice(0, 7))
      .split('-')
      .map(Number);
    const lastDay = new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10);
    const monthName = monthMatch ? monthMatch[1] : '';
    rows.push({
      date: lastDay,
      description: `Salaire ${monthName} ${monthMatch?.[2] ?? ''}`.replace(/\s+/g, ' ').trim(),
      amount: details.net,
      type: 'INCOME',
    });
  }
  return { details, rows };
}
