import { dayMonth } from '../calendar';

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
