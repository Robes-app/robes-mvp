import { dayMonth } from '../calendar';
import { sheetL1For } from '../taxonomy';

// Forwarded receipts (Wardrobe › Inbox and the receipt door): the pieces she ticks, the day a
// receipt came in, and her address set to break only at the @. Shared by web and native.

// Ticks a piece on or off; the list stays in the receipt's own order.
export function toggleKept(kept: readonly number[], index: number): number[] {
  return kept.includes(index)
    ? kept.filter((i) => i !== index)
    : [...kept, index].sort((a, b) => a - b);
}

export type ReceivedDay =
  | { kind: 'today' }
  | { kind: 'yesterday' }
  | { kind: 'date'; label: string };

const localDay = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Today, Yesterday or "23 Jul", on her own calendar.
export function receivedDay(receivedAt: string, now: Date = new Date()): ReceivedDay {
  const day = localDay(new Date(receivedAt));
  if (day === localDay(now)) return { kind: 'today' };
  const before = new Date(now);
  before.setDate(before.getDate() - 1);
  if (day === localDay(before)) return { kind: 'yesterday' };
  return { kind: 'date', label: dayMonth(day) };
}

// "abc…@in.mail.byrobes.com" → the local part for line one and "@in.mail…" for line two, so the
// address only ever breaks at the @ (Add Piece redline 05).
export function splitAddress(address: string): { local: string; domain: string } {
  const at = address.lastIndexOf('@');
  if (at <= 0) return { local: address, domain: '' };
  return { local: address.slice(0, at), domain: address.slice(at) };
}

// A receipt line that names no piece ("REF 09003701051", "SKU 4471", the brand alone): the piece
// reads as its brand and category instead, "Zara top", for her to rename (UX audit, 15 Nov). A
// line with a real name keeps it word for word.
const CODE_WORD = /^(ref|sku|art|item|no|nr|code|style|model|product|#)[.:#]*$/i;
const NOUN: Record<string, string> = {
  Accessories: 'accessory',
  Activewear: 'activewear',
  Bags: 'bag',
  Bottoms: 'bottoms',
  'Dresses & jumpsuits': 'dress',
  Jewellery: 'jewellery',
  Knitwear: 'knit',
  'Loungewear & sleepwear': 'loungewear',
  Outerwear: 'outerwear',
  Shoes: 'shoes',
  'Swim & beach': 'swimwear',
  'Tailoring & suiting': 'tailoring',
  Tops: 'top',
  'Underwear & intimates': 'underwear',
};

export function namesNoPiece(label: string, brand?: string | null): boolean {
  const words = label
    .trim()
    .split(/\s+/)
    .filter((w) => w && !CODE_WORD.test(w) && !/\d/.test(w));
  const rest = words.join(' ');
  if (brand && rest.toLowerCase() === brand.trim().toLowerCase()) return true;
  return (rest.match(/\p{L}/gu) ?? []).length < 3;
}

export function pieceName(line: {
  label: string;
  brand?: string | null;
  categoryL2?: string | null;
  categoryL3?: string | null;
}): string {
  if (!namesNoPiece(line.label, line.brand)) return line.label.trim();
  const l1 = line.categoryL2 ? sheetL1For(line.categoryL2) : null;
  const noun = line.categoryL3?.trim().toLowerCase() || (l1 ? NOUN[l1] : undefined) || 'piece';
  const brand = line.brand?.trim();
  const name = brand ? `${brand} ${noun}` : noun;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// A held piece whose product photo is still on its way: asked of the fetcher and not yet settled,
// or stored and still rendering. Review asks again until it lands (web and native).
export function photoLanding(
  entry: { items: readonly { reading: boolean; image: { status: string } | null }[] } | undefined,
): boolean {
  return !!entry?.items.some((i) => i.reading || i.image?.status === 'pending');
}
