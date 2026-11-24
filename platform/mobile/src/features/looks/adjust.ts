import { useApiClient } from '@robes/api-client/react';
import { askChanges, askRack, type Look, type LookAskInput } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import {
  type AskReason,
  adjustReduce,
  type Balance,
  EMPTY_ADJUST,
  type FollowUp,
  feedbackBubble,
  followUp,
  isWorking,
  nameNoBrand,
  noteShort,
  pictureLanding,
  theName,
  threadHistory,
} from '@robes/core/looks';
import { useToast } from '@robes/ui-native';
import { useEffect, useReducer, useRef, useState } from 'react';
import { nativeAnalytics } from '@/lib/analytics';
import { errorMessage } from '@/lib/errors';
import type { useLookEditor } from './look-editor';
import { useInvalidateLooks, useJobResult, useLookAsk } from './look-states';

export type AdjustSurface = 'draft' | 'saved' | 'suggested' | 'day';
type Editor = Pick<ReturnType<typeof useLookEditor>, 'rack' | 'answer' | 'redraw'>;

// A picture asked for and never seen to land is let go of after this long.
const DRAW_TIMEOUT_MS = 120_000;
// A change no draw follows (nothing to draw it on): Robes asks after this long instead.
const NO_DRAW_MS = 8_000;
const fb = copy.draftLook.feedback;

// Robes' question after a change, in words (docked prompt PRD Q1–Q4). Twin: the other client's
// useAdjust.
function askAfter(f: FollowUp): string {
  switch (f.kind) {
    case 'occasion':
      return fb.questionFor(f.occasion);
    case 'feel':
      return fb.question;
    case 'reason':
      return fb.askAfter[f.reason];
    case 'piece':
      return fb.withoutPiece(f.piece);
    case 'restyle':
      return fb.restyle.ask;
    case 'closer':
      return fb.closer;
  }
}

// Working a look through the prompt (Front Door design 3b, plan 2026-11-03 §1.4): the same on
// home's box and on the look's page. Web twin: app/src/lib/adjust.ts.
export function useAdjust(look: Look, editor: Editor, surface: AdjustSurface) {
  const api = useApiClient();
  const toast = useToast();
  const refresh = useInvalidateLooks();
  const [state, dispatch] = useReducer(adjustReduce, EMPTY_ADJUST);
  // A piece I don't like rides as "Not the {piece}", the one she tapped (docked prompt Q6).
  const picked = state.piece ? editor.rack.rows.find((r) => r.key === state.piece) : undefined;
  const notThe = picked ? fb.notThe(theName(nameNoBrand(picked.name, picked.brand))) : null;
  const d = copy.draft;
  // Her brief, when Robes made this look from her words: Restyle it all starts fresh from it.
  const brief = useRef('');
  // The prompt's own dock (a draft, a saved look, a suggestion) shows a change instead of telling it (redline
  // 14 Nov): no line says what was done, and the picture is drawn without being asked.
  const shown = surface === 'draft' || surface === 'saved' || surface === 'suggested';
  // The picture being drawn was not asked for in words: nothing is said when it lands.
  const hushed = useRef(false);
  // Her last send, so one tap that fires twice (the keyboard's send and the button) is one line.
  const lastSend = useRef({ key: '', at: 0 });
  // The changes she has sent on this look in this session (docked prompt PRD, Analytics).
  const changes = useRef(0);
  // What her last ask carried: Robes' question once the change lands (Q2–Q4), and her words for
  // the like a thumbs up keeps (Q10).
  const lastAsk = useRef<{ question: string; said: string }>({ question: fb.closer, said: '' });

  // A send that asked to draw once answered, and the draw it calls (defined further down).
  const drawAfter = useRef(false);
  const draw = useRef<() => void>(() => {});

  // Her ask: an edit comes back keyed by the rack she sent.
  const ask = useLookAsk(look.id, (result) => {
    // A note about the whole picture (look-ask v5, docked prompt PRD M5): it becomes the look's
    // picture note and the model is drawn again with it. Nothing on the rack changes; Robes asks
    // "Closer?" once the picture lands.
    if (result.intent === 'picture' && result.picture) {
      drawAfter.current = false;
      dispatch({ type: 'work', text: d.dressing });
      hushed.current = true;
      sawPending.current = false;
      setDrawing(true);
      setHeldQuestion(fb.closer);
      editor.redraw(result.picture).catch((err) => {
        setDrawing(false);
        dispatch({ type: 'settle' });
        // No picture is coming: Robes asks at once.
        setHeldQuestion(null);
        dispatch({ type: 'question', text: fb.closer });
        toast.show({ message: errorMessage(err) });
      });
      return;
    }
    const changed = askChanges(result);
    // Robes' words stand when nothing changed (it asks back, or says why not). A change is seen
    // on the rack and the model, and Robes only asks its question.
    // An answer that names a change none of which landed says so plainly: its own "Done. The
    // scarf is on the look now." stood over a look with no scarf (testing, 18 Nov).
    const claimed = !changed && ['swap', 'back', 'styled'].includes(result.intent);
    if (!changed || !shown)
      dispatch({
        type: 'robes',
        text: claimed ? copy.prompt.didNotLand : result.reply || copy.prompt.doneNone,
      });
    else dispatch({ type: 'settle' });
    if (result.noticed) dispatch({ type: 'filed', text: copy.prompt.noticed });
    const slots = result.swaps.length + result.back.length + result.styled.length;
    if (slots)
      nativeAnalytics.track('look_prompt_applied', { surface, intent: result.intent, slots });
    if (changed) editor.answer(result);
    // The drawer's send draws the picture once the rack is answered (D14).
    if (drawAfter.current) {
      drawAfter.current = false;
      if (changed) draw.current();
    }
    // Robes asks once per returned look: its own question about the change it made when it
    // wrote one ("Does the chartreuse coat feel more exciting?", Annie 18 Nov), else the one
    // about what she asked (docked prompt PRD Q2–Q4). Held until the picture wears the change
    // (16 Nov: "How does the pink coat feel?" stood over the old picture while it was dressed).
    if (changed) setHeldQuestion(result.followUp || lastAsk.current.question);
  });
  const wasReading = useRef(ask.reading);
  useEffect(() => {
    if (wasReading.current && !ask.reading && isWorking(state)) dispatch({ type: 'settle' });
    wasReading.current = ask.reading;
  }, [ask.reading, state]);

  // Dress it again: a job re-writes the look in place; the fresh look replaces the rack.
  const [redressJob, setRedressJob] = useState<string | null>(null);
  useJobResult(redressJob, (job) => {
    setRedressJob(null);
    dispatch({ type: 'settle' });
    if (job.status === 'succeeded' || job.status === 'partial') {
      dispatch({ type: 'drawn' });
      dispatch({ type: 'question', text: fb.restyle.ask });
    } else toast.show({ message: copy.swapFailed });
    // The look itself is read again: the lists' refresh alone never reaches the open look, so a
    // restyle used to leave the old rack standing.
    void api.call('looks.get', { params: { id: look.id } }).then(refresh, () => refresh());
  });

  // Update the model: the picture's landing is read off the look (it reads pending meanwhile).
  const [drawing, setDrawing] = useState(false);
  const sawPending = useRef(false);
  // Landed means shown: drawn, renditions and all (pictureLanding).
  const picturePending = pictureLanding(look);
  // Robes' question about a change, waiting for the picture to wear it: asked once the draw has
  // landed (or timed out), or straight away when no draw follows the change.
  const [heldQuestion, setHeldQuestion] = useState<string | null>(null);
  const askHeld = useRef(() => {});
  askHeld.current = () => {
    if (heldQuestion === null) return;
    dispatch({ type: 'question', text: heldQuestion });
    setHeldQuestion(null);
  };
  useEffect(() => {
    if (heldQuestion === null || drawing || picturePending) return;
    const t = setTimeout(() => askHeld.current(), NO_DRAW_MS);
    return () => clearTimeout(t);
  }, [heldQuestion, drawing, picturePending]);
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
    // The picture now wears the rack: a change counted while it was being drawn is caught up.
    dispatch({ type: 'drawn' });
    if (!hushed.current) dispatch({ type: 'robes', text: d.modelDone });
    hushed.current = false;
    askHeld.current();
  }, [drawing, picturePending]);
  useEffect(() => {
    if (!drawing) return;
    const t = setTimeout(() => {
      sawPending.current = false;
      setDrawing(false);
      dispatch({ type: 'settle' });
      askHeld.current();
    }, DRAW_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [drawing]);

  const restyle = (note: string | null) => {
    nativeAnalytics.track('draft_redressed', { surface, asked: note !== null });
    void api
      .call('looks.restyle', { params: { id: look.id }, input: note ? { note } : {} })
      .then(({ jobId }) => setRedressJob(jobId))
      .catch((err) => {
        dispatch({ type: 'settle' });
        toast.show({ message: errorMessage(err) });
      });
  };

  draw.current = () => updateModel(false, shown);

  const stale = state.pending > 0 || look.pictureStale;
  const badge = state.pending || (look.pictureStale ? 1 : 0);
  const busy = ask.reading || redressJob !== null || drawing;

  // `hush`: drawn on Robes' own account after a change, so no line asks for it or reports it.
  const updateModel = (quiet = false, hush = false) => {
    nativeAnalytics.track('draft_model_updated', { surface, pending: badge });
    if (!quiet) {
      if (!hush) dispatch({ type: 'her', text: d.modelAsked });
      dispatch({ type: 'work', text: d.dressing });
      hushed.current = hush;
      sawPending.current = false;
      setDrawing(true);
    }
    dispatch({ type: 'drawn' });
    editor.redraw().then(
      (started) => {
        // Nothing new to draw (the picture already wears this rack): Robes asks now, never after
        // waiting out DRAW_TIMEOUT_MS for a picture that is not coming (19 Nov: two minutes,
        // then "How does the coat sit with the hoodie?" over the old picture).
        if (started || quiet) return;
        sawPending.current = false;
        setDrawing(false);
        dispatch({ type: 'settle' });
        askHeld.current();
      },
      (err) => {
        setDrawing(false);
        dispatch({ type: 'settle' });
        // No picture is coming: Robes asks about the change as it stands.
        askHeld.current();
        if (!quiet) toast.show({ message: errorMessage(err) });
      },
    );
  };

  return {
    state,
    pieceToken: notThe,
    // How many changes she has sent on this look, for the save's event.
    changeCount: () => changes.current,
    stale,
    badge,
    busy,
    // The model is being dressed again (a change's picture, a restyle), not Robes reading.
    dressing: redressJob !== null || drawing,
    canRedress: look.setId !== null,
    placeholder: state.asking
      ? d.notRight
      : state.thread.some((l) => l.who === 'her')
        ? d.adjustAfter
        : d.adjust,
    // `draw`: the picture is drawn once the answer lands (the drawer's Send and Generate); only a
    // live look writes its rack as it goes, so a saved look's edit still draws on Update.
    // True when the send went to Robes (an ask or a restyle is now in hand).
    send: (
      words: string,
      opts: { draw?: boolean; balance?: Balance; context?: LookAskInput['context'] } = {},
    ): boolean => {
      const text = words.trim();
      // What she tapped after a thumbs down rides with her words, or stands for them (F10, F11).
      const { reasons, restyle: afresh } = state;
      if ((!text && reasons.length === 0 && !afresh) || busy) return false;
      const key = `${text}|${reasons.join()}|${afresh}`;
      const now = Date.now();
      if (lastSend.current.key === key && now - lastSend.current.at < 1500) return false;
      lastSend.current = { key, at: now };
      drawAfter.current = opts.draw === true && look.status === 'draft';
      const labels = afresh
        ? [fb.restyle.label]
        : reasons.map((r) => (r === 'piece' && notThe ? notThe : fb.reasons[r].label));
      const fromThumb = state.verdict === 'down';
      const report = (action: 'adjust' | 'restyle') => {
        if (!fromThumb) return;
        nativeAnalytics.track('look_feedback_sent', {
          surface,
          reason: reasons.length > 1 ? 'several' : (reasons[0] ?? 'none'),
          has_text: text.length > 0,
          action,
        });
      };
      const sent = (kind: 'typed' | 'reason' | 'piece' | 'restyle') => {
        changes.current += 1;
        nativeAnalytics.track('look_prompt_sent', {
          surface,
          chars: text.length,
          from_draft: false,
          kind,
          change_n: changes.current,
        });
      };
      dispatch({ type: 'her', text: feedbackBubble(labels, text) });
      // Restyle it all (F12): a new look from the same brief, her words as the note.
      if (afresh) {
        report('restyle');
        sent('restyle');
        dispatch({ type: 'work', text: fb.restyle.work(brief.current) });
        restyle(text || null);
        return true;
      }
      if (state.asking) {
        dispatch({ type: 'answered' });
        sent('typed');
        dispatch({ type: 'robes', text: d.thanks });
        dispatch({ type: 'work', text: d.dressingAgain });
        restyle(text);
        return true;
      }
      if (editor.rack.rows.length === 0) return false;
      report('adjust');
      sent(
        reasons.length === 0
          ? 'typed'
          : reasons.length === 1 && reasons[0] === 'piece'
            ? 'piece'
            : 'reason',
      );
      const only = reasons.length === 1 ? reasons[0] : undefined;
      dispatch({
        type: 'work',
        text: only ? fb.reasons[only].work : fromThumb ? fb.adjusting : d.reading,
      });
      lastAsk.current = {
        question: askAfter(
          followUp({
            reasons,
            piece: picked ? theName(nameNoBrand(picked.name, picked.brand)) : null,
            text,
          }),
        ),
        said: feedbackBubble(labels, text),
      };
      ask.send({
        surface,
        text: notThe ? feedbackBubble([notThe], text) : text,
        ...(reasons.length ? { reasons } : {}),
        thread: threadHistory(state.thread),
        rack: askRack(editor.rack, look.anchor?.id ?? null),
        // The prompt's sources (look prompt PRD S5): where the answer may draw its pieces from;
        // and the day's weather while its chip stands.
        ...(opts.balance ? { balance: opts.balance } : {}),
        ...(opts.context ? { context: opts.context } : {}),
      });
      return true;
    },
    // Her thumb on Robes' question (F5, F6, F7). A thumbs up ends it there: nothing is saved
    // and nothing is filed. A thumbs down opens the reasons. She can answer while the picture is
    // still being drawn; a send waits for it.
    thumb: (verdict: 'up' | 'down') => {
      if (state.verdict !== 'ask') return;
      // A thumbs up keeps the look, her brief and the change it answered as liked, in her style
      // memory (docked prompt PRD Q10); it files no observation and says nothing.
      if (verdict === 'up') {
        const body = [brief.current, lastAsk.current.said]
          .filter(Boolean)
          .join(' · ')
          .slice(0, 240);
        void api
          .call('me.memory.record', {
            input: {
              kind: 'verdict',
              verdict: 1,
              surface,
              subject: look.name.slice(0, 120),
              lookId: look.id,
              ...(body ? { body } : {}),
            },
          })
          .catch(() => undefined);
      }
      nativeAnalytics.track('look_feedback', { surface, verdict, change_n: changes.current });
      dispatch({ type: verdict });
    },
    reason: (reason: AskReason) => dispatch({ type: 'reason', reason }),
    restyleAll: () => dispatch({ type: 'restyle' }),
    // The piece she taps after Which piece? (Q6), by its rack key.
    piece: (key: string) => dispatch({ type: 'piece', key }),
    // Robes made this look from her brief just now (the draft's first send): her words head the
    // thread and Robes asks its one question (F1, F3).
    // With no words (a draft Robes made, opened again) only the question is asked. `dressing`:
    // the picture is still being drawn, so Robes is at work under her words and the question
    // waits for `asks`, once the picture lands (16 Nov: never thumbs on an undressed model).
    opened: (words: string, occasion?: string, dressing = false) => {
      brief.current = words;
      if (words) dispatch({ type: 'her', text: words });
      if (dressing) dispatch({ type: 'work', text: d.dressing });
      else dispatch({ type: 'question', text: occasion ? fb.questionFor(occasion) : fb.question });
    },
    // The picture `opened` waited for has landed: the work line goes and Robes asks.
    asks: (occasion?: string) => {
      dispatch({ type: 'settle' });
      dispatch({ type: 'question', text: occasion ? fb.questionFor(occasion) : fb.question });
    },
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
    another: () => {
      if (busy) return;
      dispatch({ type: 'robes', text: d.another });
      dispatch({ type: 'work', text: d.dressingAgain });
      restyle(null);
    },
    updateModel: () => {
      if (!busy) updateModel();
    },
    drawForSave: () => {
      if (stale) updateModel(true);
    },
    // A saved look's prompt change, once kept: the model wears it at once, with nothing said.
    drawNow: () => {
      if (stale) updateModel(false, true);
    },
    // A draft's rack, as she builds it by hand: the model wears it with nothing said and nothing
    // in the thread; the picture shows its own progress (Annie, 16 Nov).
    dress: () => updateModel(true),
    landed: (fresh: Look) => {
      const line = noteShort(fresh.note, 1) || fresh.name;
      const find = d.toFind(fresh.proposals.length);
      dispatch({ type: 'settle' });
      dispatch({ type: 'robes', text: `${d.first(line)}${find ? ` ${find}` : ''}` });
    },
    changed: () => dispatch({ type: 'changed' }),
    // Her words as sent from home's box, before the draft exists to ask about.
    her: (text: string) => dispatch({ type: 'her', text }),
    work: (text: string) => dispatch({ type: 'work', text }),
    settle: () => dispatch({ type: 'settle' }),
    reset: () => dispatch({ type: 'reset' }),
  };
}

export type Adjust = ReturnType<typeof useAdjust>;
