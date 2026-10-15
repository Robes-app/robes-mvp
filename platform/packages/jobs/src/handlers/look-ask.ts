import { AiError, type AiProvider } from '@robes/ai';
import {
  type AskContext,
  buildSystem,
  buildUser,
  FEATURE,
  MAX_OUTPUT_TOKENS,
  normaliseAnswer,
  Output,
  TEMPERATURE,
} from '@robes/ai/prompts/look-ask';
import { LookAskJobInput, type LookAskResult } from '@robes/contracts';
import type { SystemRepositories } from '@robes/db';
import { JobError, type JobHandler } from '../runtime';

export interface LookAskDeps {
  ai: AiProvider;
  styling: Pick<SystemRepositories['styling'], 'context'>;
  suggested: Pick<SystemRepositories['suggested'], 'look'>;
  // Her brief and memory belong to the style memory; the prompt only notices and remembers.
  lookPrompt: Pick<SystemRepositories['lookPrompt'], 'notice' | 'remember'>;
  ledger: Pick<SystemRepositories['ledger'], 'record'>;
}

// The look prompt (legacy /api/look/ask): her words read against the rack she sent, an edit back,
// keyed by her own row keys. Nothing on the look is written here — the edit lands where she is
// (a draft is saved by its surface; a saved look's edit waits for Update). A rule waits as a
// Robes-noticed line. Her rack's pieces are named from her wardrobe, never from the request.
export function createLookAskHandler(deps: LookAskDeps): JobHandler {
  return {
    budgetMs: 45_000,
    async run(ctx) {
      const parsed = LookAskJobInput.safeParse(ctx.input);
      if (!parsed.success) throw new JobError('invalid_input');
      const input = parsed.data;
      const found = await deps.suggested.look(ctx.userId, input.lookId);
      if (!found) throw new JobError('not_found');
      const her = await deps.styling.context(ctx.userId);
      const byId = new Map(her.closet.map((c) => [c.id, c]));
      // A piece she sent that isn't in her wardrobe drops off the rack the model sees.
      type Row = { key: string; pieceId: string | null; row: AskContext['rack'][number] };
      const rows = input.rack.flatMap((r): Row[] => {
        if (r.pieceId) {
          const piece = byId.get(r.pieceId) ?? found.pieces.find((p) => p.id === r.pieceId);
          if (!piece) return [];
          return [
            {
              key: r.key,
              pieceId: r.pieceId,
              row: {
                name: piece.label,
                category: piece.category ?? '',
                owned: true,
                keep: r.keep,
                was: r.was,
                styled: r.styled,
              },
            },
          ];
        }
        if (!r.proposal) return [];
        return [
          {
            key: r.key,
            pieceId: null,
            row: {
              name: r.proposal.name,
              category: r.proposal.category,
              owned: false,
              keep: r.keep,
              was: r.was,
              styled: r.styled,
            },
          },
        ];
      });
      if (rows.length === 0) throw new JobError('empty_look');
      const pool = her.closet.filter((c) => !rows.some((r) => r.pieceId === c.id));
      const askCtx: AskContext = {
        gender: her.gender,
        styleDna: her.styleDna,
        styleIcons: her.styleIcons,
        pool: {
          kind: 'wardrobe',
          items: pool.map((c) => ({
            label: c.label,
            category: c.category,
            color: c.color,
            brand: c.brand,
          })),
        },
        rack: rows.map((r) => r.row),
        context: input.context ?? null,
        thread: input.thread,
      };
      let out: Output;
      try {
        const res = await deps.ai.generateJson({
          feature: FEATURE,
          capability: 'text.fast',
          system: buildSystem(askCtx),
          user: buildUser({
            name: found.look.name,
            surface: input.surface,
            text: input.text,
            thread: input.thread,
          }),
          schema: Output,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature: TEMPERATURE,
          signal: ctx.signal,
        });
        await deps.ledger.record({
          ...res.usage,
          jobId: ctx.jobId,
          userId: ctx.userId,
          feature: FEATURE,
          status: 'ok',
        });
        out = res.data;
      } catch (err) {
        if (err instanceof AiError) {
          if (err.usage) {
            await deps.ledger.record({
              ...err.usage,
              jobId: ctx.jobId,
              userId: ctx.userId,
              feature: FEATURE,
              status: err.code === 'timeout' ? 'timeout' : 'error',
            });
          }
          if (err.code === 'cancelled') throw err;
          throw new JobError(`ai_${err.code}`);
        }
        throw err;
      }
      const answer = normaliseAnswer(out, askCtx);
      const keyAt = (i: number) => rows[i]?.key;
      const result: LookAskResult = {
        intent: answer.intent,
        reply: answer.reply,
        swaps: answer.swaps.flatMap((s): LookAskResult['swaps'] => {
          const key = keyAt(s.i);
          if (!key) return [];
          if ('poolIndex' in s.to) {
            const piece = pool[s.to.poolIndex];
            if (!piece) return [];
            return [
              {
                key,
                to: {
                  pieceId: piece.id,
                  name: piece.label,
                  category: piece.category ?? '',
                  brand: piece.brand,
                },
              },
            ];
          }
          return [{ key, to: { proposal: { ...s.to.proposal, color: '' } } }];
        }),
        back: answer.back.flatMap((i) => keyAt(i) ?? []),
        backAll: answer.intent === 'back' && answer.back.length === 0,
        styled: answer.styled.flatMap((s) => {
          const key = keyAt(s.i);
          return key ? [{ key, note: s.note }] : [];
        }),
        draft: answer.draft,
        rule: answer.rule,
        noticed: false,
      };
      // Every line she sends is a verdict on the look: it lands in her memory (legacy k:'ask').
      await deps.lookPrompt.remember(ctx.userId, {
        kind: 'ask',
        surface: input.surface,
        subject: found.look.name.slice(0, 120),
        body: input.text.slice(0, 240),
        lookId: input.lookId,
      });
      // Her rule waits under Robes noticed; it is a rule only once she keeps it (legacy 2026-10-13).
      if (answer.intent === 'rule' && answer.rule) {
        result.noticed = await deps.lookPrompt.notice(ctx.userId, {
          list: 'rules',
          text: answer.rule,
          because: `You said it on “${found.look.name.slice(0, 120)}”`,
          origin: 'prompt',
        });
      }
      await ctx.writeStage('text', { ask: result });
      return { status: 'succeeded' };
    },
  };
}
