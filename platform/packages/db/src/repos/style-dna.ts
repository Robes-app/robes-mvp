import { presenceOf } from '@robes/core/avatar';
import { paletteFromWords } from '@robes/core/colour';
import { BRIEF_KEPT_MAX, paletteOf } from '@robes/core/style-dna';
import { type Kysely, sql, type Transaction } from 'kysely';
import type { Db } from '../client';
import type { DB } from '../database.types';
import { BriefListFull } from '../errors';
import type { UserId } from '../ids';

// Her Style DNA (legacy Settings 2026-10-07): taste, the facts and the brief in her words.
export type BriefList = 'loves' | 'avoids' | 'rules';
export type PendingList = BriefList | 'notes' | 'colours';
export const PENDING_MAX = 12;
export const STRUCK_MAX = 30;

export interface TastePatch {
  styleArchetypes?: string[];
  styleIcons?: string[];
  styleBrands?: string[];
  investmentLevel?: string | null;
}

export interface FactsPatch {
  heightCm?: number | null;
  sizeUk?: number | null;
  shoeUk?: number | null;
  ageBand?: string | null;
  bustBand?: number | null;
  bustCup?: string | null;
  bustCm?: number | null;
  waistCm?: number | null;
}

export interface MemoryEntryInput {
  kind: 'verdict' | 'swap' | 'strike' | 'ask';
  surface?: string | null;
  subject?: string | null;
  body?: string | null;
  verdict?: 0 | 1 | null;
  pieceOut?: string | null;
  pieceIn?: string | null;
  category?: string | null;
  lookId?: string | null;
}

// One thing she told Robes, or a look she wore (read from app.wears).
export interface MemoryEntry {
  kind: 'verdict' | 'swap' | 'strike' | 'ask' | 'wear';
  at: Date;
  surface: string | null;
  subject: string | null;
  body: string | null;
  verdict: number | null;
  pieceOut: string | null;
  pieceIn: string | null;
  category: string | null;
  pieces: number | null;
}

export interface NoticedLine {
  list: BriefList;
  text: string;
  because?: string;
  origin?: 'read' | 'prompt';
}

const LINE_COLUMNS = [
  'id',
  'list',
  'state',
  'text',
  'fullText',
  'because',
  'source',
  'origin',
  'chip',
  'loved',
  'rejected',
  'keptAt',
  'createdAt',
] as const;

const clean = (s: string, n: number): string => s.trim().replace(/\s+/g, ' ').slice(0, n);

type Q = Kysely<DB> | Transaction<DB>;

async function recordMemory(q: Q, userId: UserId, e: MemoryEntryInput): Promise<void> {
  let lookId = e.lookId ?? null;
  if (lookId) {
    const look = await q
      .selectFrom('looks')
      .select('id')
      .where('userId', '=', userId)
      .where('id', '=', lookId)
      .executeTakeFirst();
    if (!look) lookId = null;
  }
  const s = (v: string | null | undefined, n: number) => (v?.trim() ? clean(v, n) : null);
  await q
    .insertInto('styleMemory')
    .values({
      userId,
      kind: e.kind,
      surface: s(e.surface, 40),
      subject: s(e.subject, 120),
      body: s(e.body, 240),
      verdict: e.kind === 'verdict' ? (e.verdict ?? 0) : null,
      pieceOut: s(e.pieceOut, 120),
      pieceIn: s(e.pieceIn, 120),
      category: s(e.category, 40),
      lookId,
      createdAt: sql`clock_timestamp()`,
    })
    .execute();
}

// A struck line is evidence too: it lands on the memory and the oldest strikes beyond 30 go.
async function strike(trx: Transaction<DB>, userId: UserId, id: string, text: string) {
  await trx
    .updateTable('styleBriefLines')
    .set({ state: 'struck', keptAt: null })
    .where('userId', '=', userId)
    .where('id', '=', id)
    .execute();
  await recordMemory(trx, userId, { kind: 'strike', surface: 'brief', body: text.slice(0, 160) });
  await trx
    .deleteFrom('styleBriefLines')
    .where('userId', '=', userId)
    .where('state', '=', 'struck')
    .where(
      'id',
      'not in',
      trx
        .selectFrom('styleBriefLines')
        .select('id')
        .where('userId', '=', userId)
        .where('state', '=', 'struck')
        .orderBy('updatedAt', 'desc')
        .limit(STRUCK_MAX),
    )
    .execute();
}

async function ensureStyleProfile(q: Q, userId: UserId): Promise<void> {
  await q
    .insertInto('styleProfiles')
    .values({ userId })
    .onConflict((oc) => oc.column('userId').doNothing())
    .execute();
}

// Serialised per person (row lock on her user), so two adds can't both take the last place.
async function assertRoom(trx: Transaction<DB>, userId: UserId, list: BriefList): Promise<void> {
  await trx.selectFrom('users').select('id').where('id', '=', userId).forUpdate().execute();
  const row = await trx
    .selectFrom('styleBriefLines')
    .select((eb) => eb.fn.countAll<string>().as('n'))
    .where('userId', '=', userId)
    .where('list', '=', list)
    .where('state', '=', 'kept')
    .executeTakeFirst();
  if (Number(row?.n ?? 0) >= BRIEF_KEPT_MAX) throw new BriefListFull(list);
}

// Adds a pending line unless the text already stands, waits or was struck; oldest beyond 12 go.
async function addPending(
  q: Q,
  userId: UserId,
  line: {
    list: PendingList;
    text: string;
    fullText?: string | null;
    because?: string | null;
    origin: 'read' | 'prompt';
    loved?: string[];
    rejected?: string[];
  },
): Promise<boolean> {
  const text = clean(line.text, 160);
  if (!text) return false;
  const struck = await q
    .selectFrom('styleBriefLines')
    .select('id')
    .where('userId', '=', userId)
    .where('state', '=', 'struck')
    .where(sql`lower(text)`, '=', text.toLowerCase())
    .executeTakeFirst();
  if (struck) return false;
  const res = await q
    .insertInto('styleBriefLines')
    .values({
      userId,
      list: line.list,
      state: 'pending',
      text,
      fullText: line.fullText ? clean(line.fullText, 600) : null,
      because: line.because ? clean(line.because, 200) : null,
      origin: line.origin,
      loved: (line.loved ?? []).slice(0, 6),
      rejected: (line.rejected ?? []).slice(0, 6),
      // Wall-clock so lines written in one transaction keep their order.
      createdAt: sql`clock_timestamp()`,
    })
    .onConflict((oc) =>
      oc
        .expression(sql`user_id, list, lower(text)`)
        .where(sql<boolean>`state <> 'struck'`)
        .doNothing(),
    )
    .executeTakeFirst();
  if (!res.numInsertedOrUpdatedRows) return false;
  await q
    .deleteFrom('styleBriefLines')
    .where('userId', '=', userId)
    .where('state', '=', 'pending')
    .where(
      'id',
      'not in',
      q
        .selectFrom('styleBriefLines')
        .select('id')
        .where('userId', '=', userId)
        .where('state', '=', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(PENDING_MAX),
    )
    .execute();
  return true;
}

export function styleDnaRepo(db: Db) {
  return {
    async get(userId: UserId) {
      const [profile, style, lines, heroes] = await Promise.all([
        db
          .selectFrom('profiles')
          .select([
            'genderIdentity',
            'styleArchetypes',
            'styleIcons',
            'styleBrands',
            'investmentLevel',
            'heightCm',
            'sizeUk',
            sql<number | null>`shoe_uk::float8`.as('shoeUk'),
            'ageBand',
            'bustBand',
            'bustCup',
            'bustCm',
            'waistCm',
          ])
          .where('id', '=', userId)
          .executeTakeFirst(),
        db
          .selectFrom('styleProfiles')
          .select(['briefNotes', 'briefReadAt', 'userOverrides'])
          .where('userId', '=', userId)
          .executeTakeFirst(),
        db
          .selectFrom('styleBriefLines')
          .select(LINE_COLUMNS)
          .where('userId', '=', userId)
          .where('state', '<>', 'struck')
          .orderBy('createdAt', 'asc')
          .execute(),
        db
          .selectFrom('wardrobeItems')
          .select(['id', 'label', 'category', 'brand', 'imageAssetId', 'heroPosition'])
          .where('userId', '=', userId)
          .where('deletedAt', 'is', null)
          .where('heroPosition', 'is not', null)
          .orderBy('heroPosition', 'asc')
          .execute(),
      ]);
      return { profile, style, lines, heroes };
    },

    async updateTaste(userId: UserId, patch: TastePatch): Promise<void> {
      const values = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      ) as TastePatch;
      if (Object.keys(values).length === 0) return;
      await db.updateTable('profiles').set(values).where('id', '=', userId).execute();
    },

    async setFacts(userId: UserId, patch: FactsPatch): Promise<void> {
      const values = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      ) as FactsPatch;
      if (Object.keys(values).length === 0) return;
      await db.updateTable('profiles').set(values).where('id', '=', userId).execute();
    },

    // A line of her own; typing a line Robes was waiting on keeps it. False when it already stands;
    // BriefListFull when the list holds BRIEF_KEPT_MAX kept lines.
    async addLine(userId: UserId, list: BriefList, text: string, chip?: string): Promise<boolean> {
      const t = clean(text, 160);
      if (!t) return false;
      return db.transaction().execute(async (trx) => {
        const standing = await trx
          .selectFrom('styleBriefLines')
          .select('id')
          .where('userId', '=', userId)
          .where('list', '=', list)
          .where('state', '=', 'kept')
          .where(sql`lower(text)`, '=', t.toLowerCase())
          .executeTakeFirst();
        if (standing) return false;
        await assertRoom(trx, userId, list);
        const res = await trx
          .insertInto('styleBriefLines')
          .values({
            userId,
            list,
            state: 'kept',
            text: t,
            source: 'typed',
            origin: 'her',
            chip: chip ? clean(chip, 60) : null,
            keptAt: sql`now()`,
            createdAt: sql`clock_timestamp()`,
          })
          .onConflict((oc) =>
            oc
              .expression(sql`user_id, list, lower(text)`)
              .where(sql<boolean>`state <> 'struck'`)
              .doUpdateSet({ state: 'kept', keptAt: sql`now()`, source: 'typed', origin: 'her' })
              .where('styleBriefLines.state', '=', 'pending'),
          )
          .executeTakeFirst();
        return Number(res.numInsertedOrUpdatedRows ?? 0) > 0;
      });
    },

    // × on a kept line: a line Robes drafted is struck (and remembered); her own simply goes.
    async removeLine(userId: UserId, id: string): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const line = await trx
          .selectFrom('styleBriefLines')
          .select(['id', 'text', 'source'])
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('state', '=', 'kept')
          .executeTakeFirst();
        if (!line) return false;
        if (line.source === 'typed') {
          await trx.deleteFrom('styleBriefLines').where('id', '=', line.id).execute();
        } else {
          await strike(trx, userId, line.id, line.text);
        }
        return true;
      });
    },

    // Keep: a line joins its list (BriefListFull when it is full); the paragraph and the colours
    // file on her style profile.
    async keepPending(userId: UserId, id: string): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const line = await trx
          .selectFrom('styleBriefLines')
          .select(['id', 'list', 'text', 'fullText', 'loved', 'rejected'])
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('state', '=', 'pending')
          .executeTakeFirst();
        if (!line) return false;
        if (line.list === 'notes' || line.list === 'colours') {
          await ensureStyleProfile(trx, userId);
          if (line.list === 'notes') {
            await trx
              .updateTable('styleProfiles')
              .set({ briefNotes: (line.fullText ?? line.text).slice(0, 600) })
              .where('userId', '=', userId)
              .execute();
          } else {
            // A kept colour observation lands on her palette at shade level (legacy a61f211).
            const row = await trx
              .selectFrom('styleProfiles')
              .select(['palette', 'userOverrides'])
              .where('userId', '=', userId)
              .executeTakeFirst();
            const current = paletteOf({
              palette: row?.palette,
              user_overrides: row?.userOverrides,
            });
            const add = paletteFromWords(line.loved, line.rejected);
            const palette = {
              fam: { ...current.fam, ...add.fam },
              shade: { ...current.shade, ...add.shade },
              print: current.print,
            };
            await trx
              .updateTable('styleProfiles')
              .set({
                palette: JSON.stringify(palette),
                userOverrides: sql`user_overrides - 'loved_colors' - 'rejected_colors'`,
              })
              .where('userId', '=', userId)
              .execute();
          }
          await trx.deleteFrom('styleBriefLines').where('id', '=', line.id).execute();
          return true;
        }
        await assertRoom(trx, userId, line.list as BriefList);
        await trx
          .updateTable('styleBriefLines')
          .set({ state: 'kept', keptAt: sql`now()`, source: 'drafted' })
          .where('id', '=', line.id)
          .execute();
        return true;
      });
    },

    // Not me: struck, never offered again, and remembered.
    async dismissPending(userId: UserId, id: string): Promise<boolean> {
      return db.transaction().execute(async (trx) => {
        const line = await trx
          .selectFrom('styleBriefLines')
          .select(['id', 'text'])
          .where('userId', '=', userId)
          .where('id', '=', id)
          .where('state', '=', 'pending')
          .executeTakeFirst();
        if (!line) return false;
        await strike(trx, userId, line.id, line.text);
        return true;
      });
    },

    // A rule she said in passing (the look prompt) waits as a Robes-noticed line, never a filed
    // rule (legacy 1284303). False when it already stands, waits or was struck.
    notice(userId: UserId, line: NoticedLine): Promise<boolean> {
      return addPending(db, userId, {
        list: line.list,
        text: line.text,
        because: line.because ?? null,
        origin: line.origin ?? 'prompt',
      });
    },
  };
}

// What she told Robes through the app (legacy style memory, slice B).
export function styleMemoryRepo(db: Db) {
  return {
    record(userId: UserId, entry: MemoryEntryInput): Promise<void> {
      return recordMemory(db, userId, entry);
    },

    // Newest first: her told entries and her wears, merged, at most `limit`.
    async recent(userId: UserId, limit = 60) {
      const [told, wears] = await Promise.all([
        db
          .selectFrom('styleMemory')
          .select([
            'kind',
            'surface',
            'subject',
            'body',
            'verdict',
            'pieceOut',
            'pieceIn',
            'category',
            'createdAt',
          ])
          .where('userId', '=', userId)
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .execute(),
        db
          .selectFrom('wears as w')
          .innerJoin('looks as l', (j) =>
            j.onRef('l.id', '=', 'w.lookId').onRef('l.userId', '=', 'w.userId'),
          )
          .select(['l.name', 'w.pieceIds', 'w.confirmedAt'])
          .where('w.userId', '=', userId)
          .where('l.deletedAt', 'is', null)
          .orderBy('w.confirmedAt', 'desc')
          .limit(limit)
          .execute(),
      ]);
      const entries: MemoryEntry[] = [
        ...told.map((t) => ({
          kind: t.kind as MemoryEntry['kind'],
          at: t.createdAt,
          surface: t.surface,
          subject: t.subject,
          body: t.body,
          verdict: t.verdict,
          pieceOut: t.pieceOut,
          pieceIn: t.pieceIn,
          category: t.category,
          pieces: null,
        })),
        ...wears.map((w) => ({
          kind: 'wear' as const,
          at: w.confirmedAt,
          surface: null,
          subject: w.name,
          body: null,
          verdict: null,
          pieceOut: null,
          pieceIn: null,
          category: null,
          pieces: w.pieceIds.length,
        })),
      ];
      return entries.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
    },

    // Entries she has told Robes since its last read (consolidation; the memory after a read is new).
    async unreadCount(userId: UserId): Promise<number> {
      const row = await db
        .selectFrom('styleMemory as m')
        .leftJoin('styleProfiles as p', 'p.userId', 'm.userId')
        .select((eb) => eb.fn.countAll<string>().as('n'))
        .where('m.userId', '=', userId)
        .where((eb) =>
          eb.or([eb('p.briefReadAt', 'is', null), eb('m.createdAt', '>', eb.ref('p.briefReadAt'))]),
        )
        .executeTakeFirst();
      return Number(row?.n ?? 0);
    },
  };
}

export interface PendingDraft {
  list: PendingList;
  text: string;
  fullText?: string | null;
  because?: string | null;
  loved?: string[];
  rejected?: string[];
}

// Worker side of Robes' read (the style_brief job); scoped by the job owner's id (SEC-16).
export function styleBriefRepo(db: Db) {
  return {
    async evidence(userId: UserId) {
      const [profile, wardrobe, looks, lines] = await Promise.all([
        db
          .selectFrom('profiles')
          .select(['firstName', 'genderIdentity', 'styleIcons'])
          .where('id', '=', userId)
          .executeTakeFirst(),
        db
          .selectFrom('wardrobeItems as w')
          .leftJoin('wardrobeItemStats as s', 's.wardrobeItemId', 'w.id')
          .select([
            'w.label',
            'w.category',
            'w.color',
            'w.brand',
            'w.notes',
            'w.sentiment',
            'w.fitConfidence',
            'w.heroPosition',
            's.timesWorn',
            sql<unknown>`w.item_dna -> 'structural_dna' -> 'silhouette_fit'`.as('fit'),
          ])
          .where('w.userId', '=', userId)
          .where('w.deletedAt', 'is', null)
          .where('w.status', '=', 'ready')
          .orderBy('w.createdAt', 'desc')
          .limit(80)
          .execute(),
        db
          .selectFrom('looks as l')
          .select((eb) => [
            'l.name',
            eb
              .selectFrom('lookPieces as p')
              .innerJoin('wardrobeItems as w', (j) =>
                j.onRef('w.id', '=', 'p.wardrobeItemId').onRef('w.userId', '=', 'p.userId'),
              )
              .select(sql<string[]>`coalesce(array_agg(w.label order by p.position), '{}')`.as('x'))
              .whereRef('p.lookId', '=', 'l.id')
              .whereRef('p.userId', '=', 'l.userId')
              .as('pieces'),
            eb
              .selectFrom('wears as r')
              .select((e2) => e2.fn.countAll<string>().as('n'))
              .whereRef('r.lookId', '=', 'l.id')
              .whereRef('r.userId', '=', 'l.userId')
              .as('wears'),
          ])
          .where('l.userId', '=', userId)
          // Her looks only: suggested and draft looks are Robes' proposals, not her evidence.
          .where('l.status', '=', 'saved')
          .where('l.deletedAt', 'is', null)
          .orderBy('l.createdAt', 'desc')
          .limit(30)
          .execute(),
        db
          .selectFrom('styleBriefLines')
          .select(['list', 'state', 'text'])
          .where('userId', '=', userId)
          .execute(),
      ]);
      const memory = await styleMemoryRepo(db).recent(userId, 40);
      return {
        firstName: profile?.firstName ?? null,
        gender: presenceOf(profile?.genderIdentity),
        styleIcons: profile?.styleIcons ?? [],
        wardrobe: wardrobe.map((w) => ({
          label: w.label,
          category: w.category,
          color: w.color,
          brand: w.brand,
          notes: w.notes,
          sentiment: w.sentiment,
          fitConfidence: w.fitConfidence,
          hero: w.heroPosition !== null,
          timesWorn: Number(w.timesWorn ?? 0),
          fit: Array.isArray(w.fit) ? w.fit.filter((x): x is string => typeof x === 'string') : [],
        })),
        looks: looks.map((l) => ({
          name: l.name,
          pieces: l.pieces ?? [],
          wears: Number(l.wears ?? 0),
        })),
        memory,
        kept: lines.filter((l) => l.state === 'kept'),
        struck: lines.filter((l) => l.state === 'struck').map((l) => l.text),
        pending: lines.filter((l) => l.state === 'pending').map((l) => l.text),
      };
    },

    // The read replaces what an earlier read left waiting (a line she said in passing stays) and
    // stamps the read, so the memory after it counts as new.
    async saveRead(userId: UserId, drafts: PendingDraft[]): Promise<number> {
      return db.transaction().execute(async (trx) => {
        await trx
          .deleteFrom('styleBriefLines')
          .where('userId', '=', userId)
          .where('state', '=', 'pending')
          .where('origin', '=', 'read')
          .execute();
        let n = 0;
        for (const d of drafts.slice(0, PENDING_MAX)) {
          if (await addPending(trx, userId, { ...d, origin: 'read' })) n += 1;
        }
        await ensureStyleProfile(trx, userId);
        await trx
          .updateTable('styleProfiles')
          .set({ briefReadAt: sql`now()` })
          .where('userId', '=', userId)
          .execute();
        return n;
      });
    },
  };
}
