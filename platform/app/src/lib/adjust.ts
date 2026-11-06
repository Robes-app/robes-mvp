'use client';

import { useApiClient } from '@robes/api-client/react';
import { askChanges, askRack, type Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { adjustReduce, EMPTY_ADJUST, isWorking, noteShort, threadHistory } from '@robes/core/looks';
import { useToast } from '@robes/ui';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { errorCopy } from './error-copy';
import type { useLookEditor } from './look-editor';
import { useLookAsk, useRefreshLooks } from './look-states';
import { useJob } from './use-job';

export type AdjustSurface = 'draft' | 'saved' | 'suggested' | 'day';
type Editor = Pick<ReturnType<typeof useLookEditor>, 'rack' | 'answer' | 'redraw'>;

// A picture asked for and never seen to land is let go of after this long.
const DRAW_TIMEOUT_MS = 120_000;

// Working a look through the prompt (Front Door design 3b, plan 2026-11-03 §1.4): the same on
// home's box and on the look's page. Her words edit the rack at once through the look prompt and
// the picture falls behind; Update the model (or Save) draws it again; Dress it again asks what
// is not right, then re-writes the whole look from the same brief. The thread lives in memory
// only. The native twin is mobile/src/features/looks/adjust.ts.
export function useAdjust(look: Look, editor: Editor, surface: AdjustSurface) {
  const api = useApiClient();
  const toast = useToast();
  const refresh = useRefreshLooks();
  const { track } = useAnalytics().analytics;
  const [state, dispatch] = useReducer(adjustReduce, EMPTY_ADJUST);
  const d = copy.draft;

  // A send that asked to draw once answered, and the draw it calls (defined further down).
  const drawAfter = useRef(false);
  const draw = useRef<() => void>(() => {});

  // Her ask: an edit comes back keyed by the rack she sent.
  const ask = useLookAsk(look.id, (result) => {
    dispatch({ type: 'robes', text: result.reply || copy.prompt.doneNone });
    if (result.noticed) dispatch({ type: 'filed', text: copy.prompt.noticed });
    const slots = result.swaps.length + result.back.length + result.styled.length;
    if (slots) track('look_prompt_applied', { surface, intent: result.intent, slots });
    if (askChanges(result)) editor.answer(result);
    // The drawer's Send and Generate draw the picture once the rack is answered (D14).
    if (drawAfter.current) {
      drawAfter.current = false;
      if (askChanges(result)) draw.current();
    }
  });
  const askFailed = useRef(ask.reading);
  useEffect(() => {
    // The ask ended without an answer (the hook toasts): the work line goes.
    if (askFailed.current && !ask.reading && isWorking(state)) dispatch({ type: 'settle' });
    askFailed.current = ask.reading;
  }, [ask.reading, state]);

  // Dress it again: a job re-writes the look in place; the fresh look replaces the rack.
  const [redressJob, setRedressJob] = useState<string | null>(null);
  const redressing = useJob(redressJob);
  useEffect(() => {
    if (!redressJob) return;
    const job = redressing.job;
    const ended = job ? isTerminalJobStatus(job.status) : false;
    if (!ended && redressing.connection !== 'unavailable') return;
    setRedressJob(null);
    dispatch({ type: 'settle' });
    if (job?.status === 'succeeded' || job?.status === 'partial') dispatch({ type: 'drawn' });
    else toast({ message: copy.swapFailed });
    refresh();
  }, [redressJob, redressing.job, redressing.connection, refresh, toast]);

  // Update the model: the picture's landing is read off the look (it reads pending meanwhile).
  const [drawing, setDrawing] = useState(false);
  const sawPending = useRef(false);
  const picturePending = look.framePending || look.onModel === 'pending';
  useEffect(() => {
    if (!drawing) return;
    if (picturePending) {
      sawPending.current = true;
      return;
    }
    if (!sawPending.current) return;
    sawPending.current = false;
    setDrawing(false);
    dispatch({ type: 'settle' });
    dispatch({ type: 'robes', text: d.modelDone });
  }, [drawing, picturePending]);
  useEffect(() => {
    if (!drawing) return;
    const t = setTimeout(() => {
      sawPending.current = false;
      setDrawing(false);
      dispatch({ type: 'settle' });
    }, DRAW_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [drawing]);

  const restyle = (note: string | null) => {
    track('draft_redressed', { surface, asked: note !== null });
    void api
      .call('looks.restyle', { params: { id: look.id }, input: note ? { note } : {} })
      .then(({ jobId }) => setRedressJob(jobId))
      .catch((err) => {
        dispatch({ type: 'settle' });
        toast({ message: errorCopy(err) });
      });
  };

  draw.current = () => updateModel();

  const stale = state.pending > 0 || look.pictureStale;
  const badge = state.pending || (look.pictureStale ? 1 : 0);
  const busy = ask.reading || redressJob !== null || drawing;

  // The model asked to wear the rack as it stands; `quiet` (Save) says nothing in the thread.
  const updateModel = (quiet = false) => {
    track('draft_model_updated', { surface, pending: badge });
    if (!quiet) {
      dispatch({ type: 'her', text: d.modelAsked });
      dispatch({ type: 'work', text: d.dressing });
      sawPending.current = false;
      setDrawing(true);
    }
    dispatch({ type: 'drawn' });
    editor.redraw().catch((err) => {
      setDrawing(false);
      dispatch({ type: 'settle' });
      if (!quiet) toast({ message: errorCopy(err) });
    });
  };

  return {
    state,
    stale,
    badge,
    busy,
    // Dress it again re-writes a look Robes made; a hand-built draft has no brief to dress again.
    canRedress: look.setId !== null,
    placeholder: state.asking
      ? d.notRight
      : state.thread.some((l) => l.who === 'her')
        ? d.adjustAfter
        : d.adjust,
    // `draw`: the picture is drawn once the answer lands (the drawer's Send and Generate); only a
    // live look writes its rack as it goes, so a saved look's edit still draws on Update.
    send: (words: string, opts: { draw?: boolean } = {}) => {
      const text = words.trim();
      if (!text || busy) return;
      drawAfter.current = opts.draw === true && look.status === 'draft';
      dispatch({ type: 'her', text });
      if (state.asking) {
        dispatch({ type: 'answered' });
        dispatch({ type: 'robes', text: d.thanks });
        dispatch({ type: 'work', text: d.dressingAgain });
        restyle(text);
        return;
      }
      if (editor.rack.rows.length === 0) return;
      track('look_prompt_sent', { surface, chars: text.length, from_draft: false });
      dispatch({ type: 'work', text: d.reading });
      ask.send({
        surface,
        text,
        thread: threadHistory(state.thread),
        rack: askRack(editor.rack, look.anchor?.id ?? null),
      });
    },
    // The option under the thread: with changes pending it draws the model instead.
    redress: () => {
      if (busy) return;
      if (stale) {
        updateModel();
        return;
      }
      if (state.asking) return;
      dispatch({ type: 'her', text: d.redress });
      dispatch({ type: 'robes', text: d.ask });
      dispatch({ type: 'ask' });
    },
    // The DescribeSheet: her sentence re-writes the look Robes made, the pieces she dropped gone.
    describe: (words: string) => {
      const text = words.trim();
      if (!text || busy || look.setId === null) return;
      dispatch({ type: 'her', text });
      if (state.asking) dispatch({ type: 'answered' });
      dispatch({ type: 'work', text: d.dressingAgain });
      restyle(text);
    },
    // ↻ on the tile: another take, same brief, no question asked.
    another: () => {
      if (busy) return;
      dispatch({ type: 'robes', text: d.another });
      dispatch({ type: 'work', text: d.dressingAgain });
      restyle(null);
    },
    updateModel: () => {
      if (!busy) updateModel();
    },
    // The AdjustSheet (D21): her words restyle the picture alone, never the pieces. The picture
    // is drawn again at once with them, and they stay with the look for every later redraw.
    picture: (words: string) => {
      const note = words.trim();
      if (!note || busy) return;
      dispatch({ type: 'her', text: note });
      dispatch({ type: 'work', text: d.dressing });
      sawPending.current = false;
      setDrawing(true);
      editor.redraw(note).catch((err) => {
        setDrawing(false);
        dispatch({ type: 'settle' });
        toast({ message: errorCopy(err) });
      });
    },
    // Save with the picture behind: it is drawn as the look is saved.
    drawForSave: () => {
      if (stale) updateModel(true);
    },
    // Robes' first line once a draft lands (home's box): its note, and the pieces to find.
    landed: (fresh: Look) => {
      const line = noteShort(fresh.note, 1) || fresh.name;
      const find = d.toFind(fresh.proposals.length);
      dispatch({ type: 'settle' });
      dispatch({ type: 'robes', text: `${d.first(line)}${find ? ` ${find}` : ''}` });
    },
    // The rack changed by hand or by the prompt: the picture falls one change behind.
    changed: () => dispatch({ type: 'changed' }),
    // Her words as sent from home's box, before the draft exists to ask about.
    her: (text: string) => dispatch({ type: 'her', text }),
    work: (text: string) => dispatch({ type: 'work', text }),
    settle: () => dispatch({ type: 'settle' }),
    reset: () => dispatch({ type: 'reset' }),
  };
}

export type Adjust = ReturnType<typeof useAdjust>;
