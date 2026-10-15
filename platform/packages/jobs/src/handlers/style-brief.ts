import { AiError, type AiProvider, type Usage } from '@robes/ai';
import {
  type BriefContext,
  buildSystem,
  buildUser,
  COMPACT_MAX_OUTPUT_TOKENS,
  FEATURE,
  firstSentence,
  isThin,
  MAX_OUTPUT_TOKENS,
  normalise,
  Output,
} from '@robes/ai/prompts/style-brief';
import { twin } from '@robes/copy';
import type { PendingDraft, SystemRepositories } from '@robes/db';
import { z } from 'zod';
import { JobError, type JobHandler } from '../runtime';

export interface StyleBriefDeps {
  ai: AiProvider;
  brief: SystemRepositories['styleBrief'];
  styling: Pick<SystemRepositories['styling'], 'context'>;
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
}

// The job carries intent only; everything is read from her rows (SEC-16).
export const StyleBriefInput = z.object({}).strict();

const lower = (a: unknown): string[] =>
  Array.isArray(a)
    ? a.filter((x): x is string => typeof x === 'string').map((x) => x.toLowerCase())
    : [];

// Robes reads her wardrobe for the brief (legacy /api/stylenotes/brief + Settings obsDraft): what
// it noticed lands as lines waiting for her Keep or Not me, never filed on its own.
export function createStyleBriefHandler(deps: StyleBriefDeps): JobHandler {
  return {
    budgetMs: 160_000,
    async run(ctx) {
      if (!StyleBriefInput.safeParse(ctx.input).success) throw new JobError('invalid_input');
      const [ev, styleCtx] = await Promise.all([
        deps.brief.evidence(ctx.userId),
        deps.styling.context(ctx.userId),
      ]);
      const kept = ev.kept.map((l) => l.text);
      const briefCtx: BriefContext = {
        firstName: ev.firstName,
        gender: ev.gender,
        styleDna: styleCtx.styleDna,
        styleIcons: ev.styleIcons,
        wardrobe: ev.wardrobe,
        looks: ev.looks,
        memory: ev.memory,
        current: kept,
      };
      const system = buildSystem(briefCtx);

      const record = (usage: Usage, status: 'ok' | 'error' | 'timeout') =>
        deps.ledger.record({
          ...usage,
          jobId: ctx.jobId,
          userId: ctx.userId,
          feature: FEATURE,
          status,
        });
      const attempt = async (compact: boolean) => {
        try {
          const res = await deps.ai.generateJson({
            feature: FEATURE,
            capability: 'text.fast',
            system,
            user: buildUser(briefCtx, compact),
            schema: Output,
            maxOutputTokens: compact ? COMPACT_MAX_OUTPUT_TOKENS : MAX_OUTPUT_TOKENS,
            signal: ctx.signal,
          });
          await record(res.usage, 'ok');
          return res.data;
        } catch (err) {
          if (err instanceof AiError && err.usage) {
            await record(err.usage, err.code === 'timeout' ? 'timeout' : 'error');
          }
          throw err;
        }
      };

      let data: Output;
      try {
        try {
          data = await attempt(false);
        } catch (err) {
          // A cut or slow answer retries once on her heroes and most-worn (legacy 2026-09-30).
          if (!(err instanceof AiError) || !['invalid_output', 'timeout'].includes(err.code)) {
            throw err;
          }
          data = await attempt(true);
        }
      } catch (err) {
        if (err instanceof AiError) {
          if (err.code === 'cancelled') throw err;
          throw new JobError(`ai_${err.code}`);
        }
        throw err;
      }

      const out = normalise(data, [...kept, ...ev.struck]);
      const evidence = twin.observations.evidence(ev.wardrobe.length, ev.looks.length);
      const drafts: PendingDraft[] = [
        ...(['loves', 'avoids', 'rules'] as const).flatMap((list) =>
          out[list].map((x) => ({ list, text: x.text, because: x.because })),
        ),
      ];
      const dna = styleCtx.styleDna as { brief?: { notes?: string }; user_overrides?: unknown };
      const struck = new Set(ev.struck.map((s) => s.toLowerCase()));
      if (!dna.brief?.notes?.trim() && out.notes && !struck.has(out.notes.toLowerCase())) {
        drafts.push({
          list: 'notes',
          text: firstSentence(out.notes),
          fullText: out.notes,
          because: evidence,
        });
      }
      const overrides = (dna.user_overrides ?? {}) as Record<string, unknown>;
      const hadLoved = lower(overrides.loved_colors);
      const hadRejected = lower(overrides.rejected_colors);
      const loved = out.colours.loved
        .map((c) => c.toLowerCase())
        .filter((c) => !hadLoved.includes(c));
      const rejected = out.colours.rejected
        .map((c) => c.toLowerCase())
        .filter((c) => !hadRejected.includes(c));
      if (loved.length || rejected.length) {
        drafts.push({
          list: 'colours',
          text: twin.observations.colourLine(loved, rejected),
          because: evidence,
          loved,
          rejected,
        });
      }

      const lines = await deps.brief.saveRead(ctx.userId, drafts);
      await ctx.writeStage('text', { lines, thin: isThin(briefCtx) });
      return { status: 'succeeded' };
    },
  };
}
