import { AiError, type AiProvider } from '@robes/ai';
import { FEATURE as ANALYSE_FEATURE } from '@robes/ai/prompts/wardrobe-analyse';
import { buildUser, FEATURE, Output, SYSTEM, toDetail } from '@robes/ai/prompts/wardrobe-detail';
import { type SystemRepositories, verifiedUserId } from '@robes/db';
import { mediaKeys } from '@robes/media';
import type { MediaStorage } from '@robes/media/storage';
import type { JobLogger } from './logger';

// The one-off re-read of existing wardrobes (cutout brief §8): each piece filed before the read
// asked for a defining detail has its photograph asked that one question. It is system work, not
// hers: no quota of hers is charged, it stops at the ceiling it is given and at the photo-read
// family's daily budget, and what it writes is the detail alone (`addDetail`), never over
// anything she has answered. It never runs by itself: someone runs the CLI, after the estimate.

// Photo reads spend the full Flash (vision.analyse).
const FAMILY = 'gemini-flash';
const PAGE = 100;

export interface DetailRereadDeps {
  ai: AiProvider;
  storage: Pick<MediaStorage, 'getObject'>;
  pieces: SystemRepositories['detailReread'];
  ledger: Pick<SystemRepositories['ledger'], 'record' | 'featureCost' | 'isExhausted'>;
  logger: Pick<JobLogger, 'info' | 'warn'>;
}

export interface DetailEstimate {
  pieces: number;
  users: number;
  // What one read is priced at, and where the price came from.
  perPieceMicros: number;
  basis: 'detail-reads' | 'photo-reads' | 'none';
  sampled: number;
  totalMicros: number;
}

// What the run would cost, from the ledger: its own calls so far once there are a few, else the
// single-piece photo read's average, which sends the same photograph and asks for far more back,
// so it over-prices rather than under.
export async function estimateDetailReread(
  deps: Pick<DetailRereadDeps, 'pieces' | 'ledger'>,
): Promise<DetailEstimate> {
  const [due, own, reads] = await Promise.all([
    deps.pieces.count(),
    deps.ledger.featureCost(FEATURE, 90),
    deps.ledger.featureCost(ANALYSE_FEATURE, 90),
  ]);
  const from =
    own.calls >= 20
      ? { basis: 'detail-reads' as const, ...own }
      : reads.calls > 0
        ? { basis: 'photo-reads' as const, ...reads }
        : { basis: 'none' as const, calls: 0, avgMicros: 0 };
  return {
    ...due,
    perPieceMicros: from.avgMicros,
    basis: from.basis,
    sampled: from.calls,
    totalMicros: from.avgMicros * due.pieces,
  };
}

export interface DetailRereadResult {
  read: number;
  filed: number;
  plain: number;
  skipped: number;
  failed: number;
  spentMicros: number;
  stopped: 'done' | 'ceiling' | 'budget' | 'limit' | 'failing';
}

export async function runDetailReread(
  deps: DetailRereadDeps,
  // `expectedMicros`: what one read is expected to cost (the estimate's figure), so even the
  // first read is held to the ceiling.
  opts: { ceilingMicros: number; expectedMicros?: number; limit?: number; signal?: AbortSignal },
): Promise<DetailRereadResult> {
  const out: DetailRereadResult = {
    read: 0,
    filed: 0,
    plain: 0,
    skipped: 0,
    failed: 0,
    spentMicros: 0,
    stopped: 'done',
  };
  const signal = opts.signal ?? new AbortController().signal;
  let dearest = opts.expectedMicros ?? 0;
  let failedInARow = 0;
  let afterId: string | undefined;
  for (;;) {
    const page = await deps.pieces.due({ limit: PAGE, afterId });
    if (page.length === 0) return out;
    for (const piece of page) {
      afterId = piece.id;
      if (opts.limit !== undefined && out.read + out.skipped + out.failed >= opts.limit) {
        return { ...out, stopped: 'limit' };
      }
      // Stop while the next read still fits: the ceiling is never crossed.
      if (out.spentMicros + dearest > opts.ceilingMicros) return { ...out, stopped: 'ceiling' };
      if (await deps.ledger.isExhausted([FAMILY])) return { ...out, stopped: 'budget' };
      // A run that only fails (a bad key, the model down) stops rather than spend on errors.
      if (failedInARow >= 5) return { ...out, stopped: 'failing' };

      const userId = verifiedUserId(piece.userId);
      const photo = await deps.storage
        .getObject(mediaKeys.master(userId, piece.imageAssetId))
        .catch(() => null);
      if (!photo) {
        out.skipped += 1;
        continue;
      }
      try {
        const { data, usage } = await deps.ai.generateJson({
          feature: FEATURE,
          capability: 'vision.analyse',
          system: SYSTEM,
          user: buildUser(piece),
          images: [{ mimeType: 'image/jpeg', data: photo }],
          schema: Output,
          maxOutputTokens: 400,
          temperature: 0,
          signal,
        });
        await deps.ledger.record({
          ...usage,
          userId,
          feature: FEATURE,
          status: 'ok',
          response: data,
        });
        out.spentMicros += usage.costMicros;
        dearest = Math.max(dearest, usage.costMicros);
        failedInARow = 0;
        const detail = toDetail(data);
        const written = await deps.pieces.addDetail(userId, piece.id, detail);
        out.read += 1;
        if (!written) out.skipped += 1;
        else if (detail) out.filed += 1;
        else out.plain += 1;
      } catch (err) {
        if (!(err instanceof AiError)) throw err;
        if (err.code === 'cancelled') throw err;
        if (err.usage) {
          await deps.ledger.record({
            ...err.usage,
            userId,
            feature: FEATURE,
            status: err.code === 'timeout' ? 'timeout' : 'error',
          });
          out.spentMicros += err.usage.costMicros;
        }
        out.failed += 1;
        failedInARow += 1;
        deps.logger.warn({ pieceId: piece.id, code: err.code }, 'detail_reread_failed');
      }
    }
    deps.logger.info({ ...out }, 'detail_reread_progress');
  }
}
