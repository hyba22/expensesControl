import type {
  TransactionSource,
  TransactionType,
} from '../generated/prisma/enums.js';

export interface DemoTransaction {
  type: TransactionType;
  category: string;
  amount: number;
  date: Date;
  description: string;
  note?: string;
  source: TransactionSource;
}

// An expense from the bank unless told otherwise.
type Entry = Omit<DemoTransaction, 'date' | 'type' | 'source'> &
  Partial<Pick<DemoTransaction, 'type' | 'source'>>;

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

// Monthly limits in millimes, by category key.
export const DEMO_BUDGETS: Record<string, number> = {
  groceries: 450_000,
  restaurants: 180_000,
  transport: 120_000,
  shopping: 200_000,
  leisure: 120_000,
};

// Payslip of a junior developer in Tunis: gross 3 200 TND, CNSS 9.68 %.
const PAYSLIP = { gross: 3_200_000, cnss: 309_760, irpp: 509_740, net: 2_380_500 };

// Same seed every time, so every visitor sees the same believable account.
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const day = (year: number, month: number, date: number) =>
  new Date(Date.UTC(year, month, date));

// Six full months plus the current one, up to today.
export function buildDemoTransactions(today: Date): DemoTransaction[] {
  const rows: DemoTransaction[] = [];

  for (let back = 6; back >= 0; back--) {
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - back, 1));
    const year = first.getUTCFullYear();
    const month = first.getUTCMonth();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const until = back === 0 ? today.getUTCDate() : lastDay;
    const rand = random(year * 12 + month);
    const pick = <T>(items: T[]) => items[Math.floor(rand() * items.length)];
    const amount = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 1000);
    // Older months came from imported bank statements, this month is typed in.
    const bank: TransactionSource = back === 0 ? 'MANUAL' : 'CSV';

    const add = (date: number, row: Entry) => {
      if (date > until) return;
      rows.push({ type: 'EXPENSE', source: bank, ...row, date: day(year, month, date) });
    };

    // Paid on the last day of the month, read from the payslip.
    add(lastDay, {
      type: 'INCOME',
      category: 'salary',
      amount: PAYSLIP.net,
      description: `Salaire ${MONTHS_FR[month]} ${year}`,
      note: `Fiche de paie · brut 3 200,000 · CNSS 309,760 · IRPP 509,740`,
      source: 'PDF',
    });
    if (back === 4) {
      add(18, { type: 'INCOME', category: 'freelance', amount: 650_000, description: 'Mission freelance · site vitrine', source: 'MANUAL' });
    }
    if (back === 2) {
      add(25, { type: 'INCOME', category: 'bonus', amount: 400_000, description: 'Prime de rendement', source: 'PDF' });
    }

    add(2, { category: 'rent', amount: 750_000, description: 'Virement loyer' });
    add(1, { category: 'transport', amount: 25_000, description: 'Abonnement métro Transtu' });
    add(5, { category: 'phone_internet', amount: 35_000, description: 'Recharge Ooredoo' });
    add(8, { category: 'phone_internet', amount: 49_000, description: 'Abonnement Topnet' });
    add(12, { category: 'leisure', amount: 32_000, description: 'Netflix' });
    if (month % 2 === 0) add(10, { category: 'bills', amount: amount(85, 140), description: 'Facture STEG' });
    if (month % 3 === 1) add(14, { category: 'bills', amount: amount(28, 40), description: 'Facture SONEDE' });

    for (let i = 0; i < 6; i++) {
      add(2 + i * 5 + Math.floor(rand() * 3), {
        category: 'groceries',
        amount: amount(30, 95),
        description: pick(['Carrefour La Marsa', 'Monoprix', 'Aziza', 'Magasin Général', 'Géant Tunis City']),
      });
    }
    for (let i = 0; i < 7; i++) {
      add(1 + Math.floor(rand() * lastDay), {
        category: 'restaurants',
        amount: amount(6, 42),
        description: pick(['Café Délice', 'Pizzeria Di Napoli', 'Baguette & Baguette', 'Plan B Lac 2', 'Salon de thé El Ali', 'Mlewi Bab Bhar']),
        source: 'MANUAL',
      });
    }
    for (let i = 0; i < 6; i++) {
      add(1 + Math.floor(rand() * lastDay), { category: 'transport', amount: amount(6, 17), description: 'Course Bolt', source: 'MANUAL' });
    }
    add(9, { category: 'fuel', amount: amount(60, 80), description: 'Station Total' });
    add(23, { category: 'fuel', amount: amount(55, 75), description: 'Station Shell' });
    add(4 + Math.floor(rand() * 20), { category: 'health', amount: amount(12, 60), description: 'Pharmacie' });
    add(6 + Math.floor(rand() * 20), {
      category: 'shopping',
      amount: amount(45, 170),
      description: pick(['Zara Tunis City', 'Decathlon', 'Jumia', 'Pull & Bear']),
    });
    add(20, { category: 'leisure', amount: amount(18, 45), description: pick(['Pathé Tunis City', 'Bowling Lac', 'Concert Théâtre municipal']) });
    if (back === 3) add(15, { category: 'education', amount: 45_000, description: 'Cours Udemy' });
    if (back === 1) add(27, { category: 'family', amount: 120_000, description: 'Cadeau anniversaire maman' });
    if (back === 5) add(11, { category: 'health', amount: 60_000, description: 'Consultation médecin' });
  }

  return rows;
}
