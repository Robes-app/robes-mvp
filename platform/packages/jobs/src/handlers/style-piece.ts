import { AiError, type AiProvider, type Usage } from '@robes/ai';
import {
  type Ask,
  buildSystem,
  buildUser,
  type DayContext,
  FALLBACK_PIECE,
  FEATURE,
  MAX_OUTPUT_TOKENS,
  type Mode,
  normalisePieces,
  Output,
  type RecentSet,
  type Refine,
  type Steer,
  type StoredPiece,
  sceneOf,
  VERSION,
} from '@robes/ai/prompts/style-piece';
import { KeyPieceJobInput } from '@robes/contracts';
import {
  askDate,
  BALANCES,
  frameKey,
  type LookRole,
  newProposalKey,
  noteShort,
} from '@robes/core/looks';
import type { SuggestedSpec, SystemRepositories, UserId } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import { z } from 'zod';
import { JobError, type JobHandler } from '../runtime';
import type { DayForecastFor } from '../weather';
import { drawSuggestedFrame, type FrameRackPiece, modelReference } from './look-frame';

export interface StylePieceDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject' | 'putObject'>;
  styling: SystemRepositories['styling'];
  // Look states: the suggested looks a generation mints (absent where a runtime doesn't mint).
  suggested?: Pick<
    SystemRepositories['suggested'],
    'mintSet' | 'rewrite' | 'look' | 'setFrame' | 'failFrame'
  >;
  cells?: Pick<SystemRepositories['modelRender'], 'cell'>;
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
  forecast?: DayForecastFor;
  // Generated frames are stored as uploads; AWS renders them from the S3 event, dev renders here.
  onGenerated?(key: string): Promise<void>;
  now?: () => Date;
}

// The API contract is the job input; the worker re-parses it (never trusts the row).
export const StylePieceInput = KeyPieceJobInput;

const ROLE_OF: Record<string, LookRole> = {
  'The Canvas': 'canvas',
  'The Anchor': 'anchor',
  'The Texture': 'texture',
  'The Exclamation Point': 'exclamation',
};

// The set's record (the generation), read back on ↻ and by the deck.
export const StoredSet = z.object({
  set: z.literal(true),
  mode: z.enum(['piece', 'prompt']),
  anchor: z.discriminatedUnion('type', [
    z.object({ type: z.literal('piece'), pieceId: z.uuid(), label: z.string() }),
    z.object({ type: z.literal('text'), label: z.string() }),
  ]),
  prompt: z.string().nullable(),
  dateHint: z.string().nullable(),
  day: z
    .object({
      dayLabel: z.string().nullable(),
      city: z.string().nullable(),
      month: z.string().nullable(),
      tempRange: z.string().nullable(),
      condition: z.string().nullable(),
    })
    .nullable(),
  fallback: z.boolean(),
  wearer: z.enum(['woman', 'man']),
  ways: z.array(
    z.looseObject({ eyebrow: z.string(), title: z.string(), scene: z.string().default('') }),
  ),
  // Where she said the pieces come from; ↻ on one of the set's looks honours it again.
  balance: z.enum(BALANCES).nullable().optional(),
  balanceNote: z.string().nullable().optional(),
});

// The sets Robes already made her, read back as titles and piece names (ALREADY SHOWN).
const RecentRow = z.object({
  prompt: z.string().nullable().catch(null),
  anchor: z.object({ label: z.string() }).optional().catch(undefined),
  ways: z
    .array(
      z.object({
        title: z.string().catch(''),
        pieces: z.array(z.object({ name: z.string().catch('') })).catch([]),
      }),
    )
    .catch([]),
});
export function recentFrom(rows: readonly unknown[]): RecentSet[] {
  return rows.flatMap((data) => {
    const r = RecentRow.safeParse(data);
    if (!r.success) return [];
    return [
      {
        prompt: r.data.prompt ?? r.data.anchor?.label ?? null,
        ways: r.data.ways.map((w) => ({ title: w.title, pieces: w.pieces.map((p) => p.name) })),
      },
    ];
  });
}

function localToday(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin' }).format(now);
  }
}

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

// The rack a set's frame shows, as the API computes it from the stored look.
const specKey = (spec: SuggestedSpec) =>
  frameKey(
    spec.pieces.map((p) => p.pieceId),
    spec.proposals.map((p) => ({ name: String(p.name ?? ''), brand: String(p.brand ?? '') })),
    {},
  );

// A suggested look from one way (legacy _lkSuggSpec): her pieces with their roles, the anchor
// always on the rack, the rest proposals; the scene line is the note under the frame.
export function specFromWay(
  way: { title: string; scene: string; pieces: StoredPiece[] },
  setIndex: number,
  o: { anchorPieceId: string | null; dateHint: string | null },
): SuggestedSpec {
  const pieces: SuggestedSpec['pieces'][number][] = [];
  const proposals: Record<string, unknown>[] = [];
  for (const p of way.pieces) {
    const role = p.role ? (ROLE_OF[p.role] ?? null) : null;
    if (p.pieceId) {
      if (!pieces.some((x) => x.pieceId === p.pieceId)) pieces.push({ pieceId: p.pieceId, role });
      continue;
    }
    proposals.push({
      key: newProposalKey(),
      name: p.name,
      category: p.category,
      color: p.color,
      brand: p.brand,
      retailerHint: p.retailerHint,
      pricePoint: p.pricePoint,
      role: role ?? 'canvas',
      wishlisted: false,
    });
  }
  if (o.anchorPieceId && !pieces.some((x) => x.pieceId === o.anchorPieceId)) {
    pieces.unshift({ pieceId: o.anchorPieceId, role: 'anchor' });
  }
  return {
    setIndex,
    name: way.title.replace(/\.$/, '').trim() || 'A look',
    note: noteShort(way.scene) || null,
    pieces,
    proposals,
    anchorPieceId: o.anchorPieceId,
    dateHint: o.dateHint,
  };
}

// Style a piece, or dress a day, three ways (legacy /api/style): the looks as text first, minted
// as suggested looks for the keep-or-pass deck, then the first frame. ↻ re-writes one look.
export function createStylePieceHandler(deps: StylePieceDeps): JobHandler {
  async function record(
    ctx: { jobId: string; userId: string },
    usage: Usage | undefined,
    status: 'ok' | 'error' | 'timeout',
  ) {
    if (usage)
      await deps.ledger.record({
        ...usage,
        jobId: ctx.jobId,
        userId: ctx.userId,
        feature: FEATURE,
        status,
      });
  }

  async function generate(
    ctx: Parameters<JobHandler['run']>[0],
    system: string,
    user: string,
    photo: Uint8Array | null,
  ) {
    try {
      const text = await deps.ai.generateJson({
        feature: FEATURE,
        capability: 'text.fast',
        system,
        user,
        ...(photo ? { images: [{ mimeType: 'image/jpeg' as const, data: photo }] } : {}),
        schema: Output,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        signal: ctx.signal,
      });
      await record(ctx, text.usage, 'ok');
      return text.data;
    } catch (err) {
      if (err instanceof AiError) {
        await record(ctx, err.usage, err.code === 'timeout' ? 'timeout' : 'error');
        if (err.code === 'cancelled') throw err;
        throw new JobError(`ai_${err.code}`);
      }
      throw err;
    }
  }

  async function piecePhoto(userId: UserId, imageAssetId: string | null | undefined) {
    if (!imageAssetId) return null;
    try {
      return await deps.storage.getObject(mediaKeys.master(userId, imageAssetId));
    } catch {
      return null;
    }
  }

  async function dayContext(userId: UserId, date: string | undefined) {
    const her = await deps.styling.dailyContext(userId);
    const today = localToday(deps.now?.() ?? new Date(), her.timezone);
    const day = askDate(date, today) ?? today;
    const forecast = deps.forecast
      ? await deps.forecast({ city: her.homeCity, lat: her.homeLat, lon: her.homeLon, date: day })
      : null;
    const ctx: DayContext = {
      // The day is named only when it isn't today (legacy dayLabel).
      dayLabel: day === today ? null : fmt(day, { weekday: 'long', day: 'numeric', month: 'long' }),
      city: forecast?.city ?? her.homeCity,
      month: fmt(day, { month: 'long' }),
      tempRange: forecast?.tempRange ?? null,
      condition: forecast?.condition ?? null,
    };
    return { day: ctx, dateHint: askDate(date, today) };
  }

  const frameDeps = () => ({
    ai: deps.ai,
    storage: deps.storage,
    styling: deps.styling,
    ...(deps.cells ? { cells: deps.cells } : {}),
    ledger: deps.ledger,
    ...(deps.onGenerated ? { onGenerated: deps.onGenerated } : {}),
  });

  const rackOf = (
    pieces: StoredPiece[],
    closet: { id: string; imageAssetId?: string | null }[],
  ): FrameRackPiece[] =>
    pieces.map((p) => ({
      name: p.name,
      category: p.category,
      color: p.color,
      brand: p.brand,
      imageAssetId: p.pieceId
        ? (closet.find((c) => c.id === p.pieceId)?.imageAssetId ?? null)
        : null,
    }));

  // One frame for a set's look; a failed frame never sinks the result (UX-08).
  async function frame(
    ctx: Parameters<JobHandler['run']>[0],
    o: {
      lookId: string;
      setIndex: number;
      wearer: 'woman' | 'man';
      mode: Mode;
      fallback: boolean;
      pieceLabel: string | null;
      piecePhoto: Uint8Array | null;
      brief: string | null;
      way: { title: string; eyebrow: string; scene: string };
      rack: FrameRackPiece[];
      styleIcons: string[];
      spec: SuggestedSpec;
    },
  ): Promise<boolean> {
    await deps.styling.trackImage({
      jobId: ctx.jobId,
      userId: ctx.userId,
      idx: o.setIndex,
      role: 'hero',
      assetId: null,
      status: 'pending',
    });
    try {
      const model = await modelReference(frameDeps(), ctx.userId);
      const { spec: _spec, lookId: _lookId, ...draw } = o;
      const assetId = await drawSuggestedFrame(frameDeps(), ctx, {
        ...draw,
        model,
        capability: 'image.hero',
      });
      // Lands only while the look still wants this rack (she may have changed it meanwhile).
      await deps.suggested?.setFrame(ctx.userId, o.lookId, specKey(o.spec), assetId);
      await deps.styling.trackImage({
        jobId: ctx.jobId,
        userId: ctx.userId,
        idx: o.setIndex,
        role: 'hero',
        assetId,
        status: 'ready',
      });
      await ctx.writeStage('images', { images: [{ idx: o.setIndex, status: 'ready', assetId }] });
      return true;
    } catch (err) {
      // The claim goes back either way, so she can ask for the frame again.
      await deps.suggested?.failFrame(ctx.userId, o.lookId, specKey(o.spec)).catch(() => undefined);
      if (ctx.signal.aborted) throw err;
      await deps.styling.trackImage({
        jobId: ctx.jobId,
        userId: ctx.userId,
        idx: o.setIndex,
        role: 'hero',
        assetId: null,
        status: 'failed',
      });
      await ctx.writeStage('images', {
        images: [{ idx: o.setIndex, status: 'failed', assetId: null }],
      });
      return false;
    }
  }

  return {
    budgetMs: 180_000,
    async run(ctx) {
      const parsed = StylePieceInput.safeParse(ctx.input);
      if (!parsed.success) throw new JobError('invalid_input');
      const input = parsed.data;
      const [styleCtx, recentRows] = await Promise.all([
        deps.styling.context(ctx.userId),
        deps.styling.recentSets(ctx.userId),
      ]);
      const recent = recentFrom(recentRows);

      // ↻ on one suggested look: re-written in place, then its frame.
      if ('mode' in input && input.mode === 'restyle') {
        if (!deps.suggested) throw new JobError('unsupported');
        const found = await deps.suggested.look(ctx.userId, input.lookId);
        if (!found || found.look.status !== 'suggested' || !found.look.setId) {
          throw new JobError('not_found');
        }
        const setRow = await deps.styling.getSet(ctx.userId, found.look.setId);
        const set = StoredSet.safeParse(setRow?.data);
        if (!set.success) throw new JobError('not_found');
        const anchorPiece =
          set.data.anchor.type === 'piece'
            ? await deps.styling.anchorPiece(ctx.userId, set.data.anchor.pieceId)
            : undefined;
        const mode: Mode = set.data.mode === 'prompt' ? 'dress-me' : 'piece';
        const ask: Ask =
          mode === 'dress-me'
            ? { mode, prompt: set.data.prompt ?? set.data.anchor.label, day: set.data.day }
            : {
                mode,
                anchor: anchorPiece
                  ? { type: 'piece', label: anchorPiece.label }
                  : { type: 'text', text: set.data.anchor.label },
              };
        const proposals = z
          .array(z.looseObject({ name: z.string(), category: z.string().default('') }))
          .catch([])
          .parse(found.look.proposals ?? []);
        const others = found.siblings.map((s) => s.name);
        const refine: Refine = {
          adjustment: `A different look entirely — change the whole direction, not one piece${anchorPiece ? ', built around the same key piece' : ''}${others.length ? ', unlike the other looks' : ''}.`,
          title: found.look.name,
          pieces: [
            ...found.pieces.map((p) => ({
              name: p.label,
              category: p.category ?? '',
              owned: true,
              keep: p.id === anchorPiece?.id,
            })),
            ...proposals.map((p) => ({
              name: p.name,
              category: p.category,
              owned: false,
              keep: false,
            })),
          ],
          others,
        };
        const photo = await piecePhoto(ctx.userId, anchorPiece?.imageAssetId);
        const out = await generate(
          ctx,
          buildSystem(styleCtx, mode, {
            balance: set.data.balance ?? null,
            balanceNote: set.data.balanceNote ?? null,
            recent,
          }),
          buildUser(ask, { hasPhoto: Boolean(photo), refine }),
          photo,
        );
        const raw = out.ways[0];
        if (!raw) throw new JobError('ai_invalid_output');
        const way = {
          ...raw,
          scene: sceneOf(raw),
          pieces: normalisePieces(raw.pieces, styleCtx.closet),
        };
        const spec = specFromWay(way, found.look.setIndex ?? 0, {
          anchorPieceId: anchorPiece?.id ?? null,
          dateHint: found.look.dateHint,
        });
        if (
          !(await deps.suggested.rewrite(ctx.userId, input.lookId, spec, {
            frameKey: specKey(spec),
            jobId: ctx.jobId,
          }))
        ) {
          throw new JobError('not_found');
        }
        await ctx.writeStage('text', { setId: found.look.setId, lookIds: [input.lookId] });
        await frame(ctx, {
          lookId: input.lookId,
          setIndex: found.look.setIndex ?? 0,
          wearer: set.data.wearer,
          mode,
          fallback: false,
          pieceLabel: anchorPiece?.label ?? null,
          piecePhoto: photo,
          brief: set.data.prompt,
          way,
          rack: rackOf(way.pieces, styleCtx.closet),
          styleIcons: styleCtx.styleIcons,
          spec,
        });
        return { status: 'succeeded' };
      }

      // A piece, or her words for a day.
      const prompted = 'mode' in input && input.mode === 'prompt';
      let mode: Mode = 'piece';
      let ask: Ask;
      let anchor: z.infer<typeof StoredSet>['anchor'];
      let photo: Uint8Array | null = null;
      let anchorPieceId: string | null = null;
      let day: DayContext | null = null;
      let dateHint: string | null = null;
      let brief: string | null = null;
      const steer: Steer = {
        balance: 'balance' in input ? (input.balance ?? null) : null,
        balanceNote: 'balanceNote' in input ? (input.balanceNote ?? null) : null,
        recent,
      };
      if (prompted) {
        mode = 'dress-me';
        const dated = await dayContext(ctx.userId, input.date);
        day = dated.day;
        dateHint = dated.dateHint;
        ask = { mode, prompt: input.prompt, day };
        anchor = { type: 'text', label: input.prompt };
        brief = input.prompt;
      } else if (!('mode' in input)) {
        if (input.anchor.type === 'piece') {
          const piece = await deps.styling.anchorPiece(ctx.userId, input.anchor.pieceId);
          if (!piece) throw new JobError('not_found');
          photo = await piecePhoto(ctx.userId, piece.imageAssetId);
          anchorPieceId = piece.id;
          ask = { mode, anchor: { type: 'piece', label: piece.label } };
          anchor = { type: 'piece', pieceId: piece.id, label: piece.label };
        } else {
          ask = { mode, anchor: { type: 'text', text: input.anchor.text } };
          anchor = { type: 'text', label: input.anchor.text };
        }
        brief = input.occasion ?? null;
      } else {
        throw new JobError('invalid_input');
      }

      const out = await generate(
        ctx,
        buildSystem(styleCtx, mode, steer),
        buildUser(ask, { hasPhoto: Boolean(photo) }),
        photo,
      );
      const { fallback } = out;
      // Her profile decides the wearer; the model's judgement stands only when it is silent.
      const wearer = styleCtx.gender === 'unspecified' ? (out.wearer ?? 'woman') : styleCtx.gender;
      const ways = out.ways.slice(0, 3).map((w) => ({
        ...w,
        scene: sceneOf(w),
        pieces: normalisePieces(w.pieces, styleCtx.closet),
      }));
      const label = fallback ? FALLBACK_PIECE : anchor.label;
      const setId = await deps.styling.createSet(ctx.userId, {
        jobId: ctx.jobId,
        title: label,
        subtitle: ways.map((w) => w.title).join(' · '),
        data: {
          set: true,
          mode: prompted ? 'prompt' : 'piece',
          anchor: fallback ? { type: 'text', label } : anchor,
          prompt: prompted ? anchor.label : null,
          dateHint,
          day,
          fallback,
          wearer,
          ways,
          balance: steer.balance,
          balanceNote: steer.balanceNote,
          images: [],
          promptVersion: VERSION,
        },
      });
      const specs = ways.map((w, i) =>
        specFromWay(w, i, { anchorPieceId: fallback ? null : anchorPieceId, dateHint }),
      );
      // The hero's frame is claimed with the mint, before the set is exposed (no second draw).
      const [heroSpec] = specs;
      const lookIds = deps.suggested
        ? await deps.suggested.mintSet(
            ctx.userId,
            setId,
            specs,
            heroSpec ? { setIndex: 0, frameKey: specKey(heroSpec), jobId: ctx.jobId } : undefined,
          )
        : [];
      await ctx.writeStage('text', { setId, lookIds, fallback, wearer, ways });

      // Only the first frame is drawn now; the others when she reaches them (UX-09).
      const [hero] = ways;
      const [heroId] = lookIds;
      if (!hero || !heroSpec || !heroId) return { status: 'partial', artifactId: setId };
      const landed = await frame(ctx, {
        lookId: heroId,
        setIndex: 0,
        wearer,
        mode,
        fallback,
        pieceLabel: fallback ? null : anchor.label,
        piecePhoto: photo,
        brief,
        way: hero,
        rack: rackOf(hero.pieces, styleCtx.closet),
        styleIcons: styleCtx.styleIcons,
        spec: heroSpec,
      });
      return { status: landed ? 'succeeded' : 'partial', artifactId: setId };
    },
  };
}
