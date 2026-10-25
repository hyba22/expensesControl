import { normalize } from './parsing/text-layout.js';
import type { TransactionType } from '../generated/prisma/enums.js';

// Keywords seen on Tunisian bank statements, mapped to built-in category
// keys. The AI step will replace this with smarter suggestions.
const RULES: { key: string; type: TransactionType; words: string[] }[] = [
  { key: 'salary', type: 'INCOME', words: ['salaire', 'paie', 'vir sal'] },
  { key: 'freelance', type: 'INCOME', words: ['freelance', 'upwork', 'fiverr', 'honoraire'] },
  { key: 'bonus', type: 'INCOME', words: ['prime', 'bonus'] },
  { key: 'groceries', type: 'EXPENSE', words: ['carrefour', 'monoprix', 'aziza', 'geant', 'magasin general', 'supermarche', 'epicerie', 'mg maxi'] },
  { key: 'restaurants', type: 'EXPENSE', words: ['restaurant', 'resto', 'cafe ', 'coffee', 'pizza', 'mcdonald', 'kfc', 'baguette', 'glovo', 'patisserie'] },
  { key: 'transport', type: 'EXPENSE', words: ['taxi', 'bolt', 'uber', 'transtu', 'sncft', 'metro', 'louage', 'parking', 'peage', 'tunisair', 'nouvelair'] },
  { key: 'fuel', type: 'EXPENSE', words: ['agil', 'shell', 'total', 'oilibya', 'carburant', 'station'] },
  { key: 'bills', type: 'EXPENSE', words: ['steg', 'sonede', 'facture'] },
  { key: 'phone_internet', type: 'EXPENSE', words: ['ooredoo', 'orange', 'tunisie telecom', 'topnet', 'globalnet', 'hexabyte', 'recharge', 'internet'] },
  { key: 'health', type: 'EXPENSE', words: ['pharmacie', 'clinique', 'medecin', 'docteur', 'laboratoire', 'dentiste', 'hopital'] },
  { key: 'shopping', type: 'EXPENSE', words: ['zara', 'jumia', 'mytek', 'tunisianet', 'decathlon', 'boutique', 'shopping'] },
  { key: 'leisure', type: 'EXPENSE', words: ['cinema', 'netflix', 'spotify', 'youtube', 'playstation', 'steam', 'salle de sport', 'gym'] },
  { key: 'education', type: 'EXPENSE', words: ['ecole', 'universite', 'formation', 'cours', 'librairie', 'udemy', 'coursera'] },
  { key: 'rent', type: 'EXPENSE', words: ['loyer'] },
];

// A short key for "the same merchant": the first two words, without digits.
export const merchantKey = (description: string) =>
  normalize(description)
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['achat', 'tpe', 'prlv', 'vir', 'carte', 'paiement'].includes(w))
    .slice(0, 2)
    .join(' ');

interface CategoryRef {
  id: string;
  key: string | null;
  type: TransactionType;
}

export class Categorizer {
  constructor(
    private readonly categories: CategoryRef[],
    // merchant key -> category id, learned from the user's own history.
    private readonly history: Map<string, string>,
  ) {}

  suggest(description: string, type: TransactionType): string | null {
    // What the user chose before for this merchant wins.
    const learned = this.history.get(merchantKey(description));
    const learnedCategory = this.categories.find((c) => c.id === learned);
    if (learnedCategory?.type === type) return learnedCategory.id;

    const text = ` ${normalize(description)} `;
    const rule = RULES.find(
      (r) => r.type === type && r.words.some((w) => text.includes(w)),
    );
    const key = rule?.key ?? (type === 'INCOME' ? 'other_income' : null);
    return this.categories.find((c) => c.key === key && c.type === type)?.id ?? null;
  }
}
