// Seeded drops (plan "Seeded Christmas looks", 23 Nov): which drops are live on a day, which have
// ended, and what price a seeded piece shows her.

export interface SeedWindow {
  seedId: string;
  liveFrom: string;
  liveUntil: string;
}

// `today` is her calendar date (YYYY-MM-DD). A drop is live from its first day to its last,
// inclusive; the day after, it has ended and her unsaved looks from it go. A drop is ended early
// by moving its last day, never by deleting its file: the file is what retires its looks.
export function seedStates(
  drops: readonly SeedWindow[],
  today: string,
): { live: string[]; ended: string[] } {
  const live: string[] = [];
  const ended: string[] = [];
  for (const d of drops) {
    if (today > d.liveUntil) ended.push(d.seedId);
    else if (today >= d.liveFrom) live.push(d.seedId);
  }
  return { live, ended };
}

const SIGNS: Record<string, string> = { EUR: '€', GBP: '£' };

// The piece's price in her currency, as a look's rows print it ("£48", "€78.40"); empty when the
// shop gave none in it. Never converted: a price she sees is one the shop shows.
export function seedPricePoint(prices: { EUR?: number; GBP?: number }, currency: string): string {
  const amount = currency === 'GBP' ? prices.GBP : currency === 'EUR' ? prices.EUR : undefined;
  const sign = SIGNS[currency];
  if (amount === undefined || !sign) return '';
  return `${sign}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

// The drop whose looks still wait in Suggested (the first one met, newest first), else null:
// while there is one the Lookbook opens on Suggested, under that drop's header.
export function waitingSeed(suggested: readonly { seedId?: string | null }[]): string | null {
  return suggested.find((l) => l.seedId)?.seedId ?? null;
}
