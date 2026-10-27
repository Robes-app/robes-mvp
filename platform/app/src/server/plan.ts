import 'server-only';
import { type Plan, PlanEntry } from '@robes/contracts';
import type { UserId } from '@robes/db';
import { repos } from './db';
import { isFlagEnabled } from './flags';
import { toLooks } from './looks-entity';

type EntryRow = NonNullable<Awaited<ReturnType<typeof repos.plan.get>>>;

// YYYY-MM-DD in her timezone; en-CA formats dates in ISO order.
export function todayIn(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function toEntries(userId: UserId, rows: EntryRow[]): Promise<PlanEntry[]> {
  const lookIds = [...new Set(rows.flatMap((r) => (r.lookId ? [r.lookId] : [])))];
  const lookRows = (await Promise.all(lookIds.map((id) => repos.looks.get(userId, id)))).filter(
    (l) => l !== undefined,
  );
  const looks = new Map((await toLooks(userId, lookRows)).map((l) => [l.id, l]));
  return rows.flatMap((row) => {
    const look = row.lookId ? looks.get(row.lookId) : undefined;
    if (!look) return [];
    // Rows never leave as-is (CLAUDE.md rule 8): parse through the contract.
    return [
      PlanEntry.parse({
        id: row.id,
        date: row.dayDate,
        slot: row.slot,
        activity: row.activity,
        worn: row.worn,
        look,
      }),
    ];
  });
}

// While trips are hidden their placed looks stay in the database but off every plan read (2eacfb4).
export function withoutTripLooks(entries: PlanEntry[], tripsOn: boolean): PlanEntry[] {
  return tripsOn ? entries : entries.filter((e) => e.look.source !== 'travel');
}

export async function loadPlan(userId: UserId, from: string, days: number): Promise<Plan> {
  const to = addDays(from, days - 1);
  const [rows, names, tripsOn] = await Promise.all([
    repos.plan.range(userId, from, to),
    repos.plan.names(userId, from, to),
    isFlagEnabled('trips'),
  ]);
  const nameOf = new Map(names.map((n) => [n.dayDate, n.name]));
  const entries = withoutTripLooks(await toEntries(userId, rows), tripsOn);
  return {
    from,
    to,
    days: Array.from({ length: days }, (_, i) => {
      const date = addDays(from, i);
      return {
        date,
        name: nameOf.get(date) ?? null,
        entries: entries.filter((e) => e.date === date),
      };
    }),
  };
}
