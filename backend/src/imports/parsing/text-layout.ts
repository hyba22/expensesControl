// A piece of text on a page with its position. y grows downwards (like on
// screen), whatever the source: PDF text or OCR words.
export interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
}

export interface Line {
  y: number;
  items: TextItem[];
  text: string;
}

// Groups items whose vertical positions are close into lines, top to bottom,
// each sorted left to right.
export function groupLines(items: TextItem[], tolerance = 3): Line[] {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const lines: { y: number; items: TextItem[] }[] = [];
  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l.y - item.y) <= tolerance);
    if (line) line.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  return lines.map((l) => {
    const ordered = mergeSplitAmounts(l.items.sort((a, b) => a.x - b.x));
    return { y: l.y, items: ordered, text: ordered.map((i) => i.text).join(' ') };
  });
}

// OCR often splits "2 836,500" into "2" and "836,500": glue them back.
function mergeSplitAmounts(items: TextItem[]) {
  const out: TextItem[] = [];
  for (const item of items) {
    const previous = out[out.length - 1];
    const gap = previous ? item.x - (previous.x + previous.width) : Infinity;
    if (
      previous &&
      /^\d{1,3}$/.test(previous.text) &&
      /^\d{3}[,.]\d{1,3}$/.test(item.text) &&
      gap < 12
    ) {
      out[out.length - 1] = {
        ...previous,
        text: `${previous.text} ${item.text}`,
        width: item.x + item.width - previous.x,
      };
    } else {
      out.push(item);
    }
  }
  return out;
}

// Amounts as printed on Tunisian documents: "1 308,952", "985,637",
// "1.308,952", "-12,500". Decimals are required so that ids, dates and
// counts are not mistaken for money.
const AMOUNT = /^[-+]?\d{1,3}(?:[ .  ]\d{3})*[,.]\d{1,3}$|^[-+]?\d+[,.]\d{1,3}$/;

export const isAmount = (text: string) => AMOUNT.test(text.trim());

// Text amount -> millimes (signed), or null.
export function toMillimes(text: string): number | null {
  let clean = text
    .replace(/(tnd|dt)/gi, '')
    .replace(/[\s  ']/g, '')
    .trim();
  if (!clean || /[.,]{2}/.test(clean)) return null;
  const negative = clean.startsWith('-');
  clean = clean.replace(/^[-+]/, '');
  const last = Math.max(clean.lastIndexOf(','), clean.lastIndexOf('.'));
  if (last !== -1) {
    const separator = clean[last];
    if (clean.split(separator).length > 2) clean = clean.replace(/[.,]/g, '');
    else
      clean = `${clean.slice(0, last).replace(/[.,]/g, '')}.${clean.slice(last + 1)}`;
  }
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(clean)) return null;
  const [whole, decimals = ''] = clean.split('.');
  const millimes = Number(whole) * 1000 + Number(decimals.padEnd(3, '0'));
  return negative ? -millimes : millimes;
}

// "05/03/2026", "05-03-26", "05.03.2026" or "2026-03-05" -> "2026-03-05".
export function toDay(text: string): string | null {
  const value = text.trim();
  let year: number, month: number, day: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (match) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(value);
    if (!match) return null;
    [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (year < 100) year += 2000;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
