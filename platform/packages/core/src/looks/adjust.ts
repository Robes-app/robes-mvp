// The adjust thread (Front Door design 3b, plan 2026-11-03 §1.1 and §1.4): what she and Robes say
// while a look is worked on through the prompt — on home's box and on the look's page alike — and
// how many changes the picture has not caught up with. Pure; web and native drive it the same
// way. Nothing here is ever stored: a page load starts a fresh thread.

// The thread sent with an ask is its last six lines (legacy REFINE thread). Defined here, not in
// the index that re-exports this file, so the two never import each other.
export const ASK_THREAD_MAX = 6;

// What is not right with a look (look prompt PRD F8): the reasons she can tap after a thumbs
// down, each the aspect Robes changes while it keeps the rest. Up to three ride one ask.
export const ASK_REASONS = ['dressy', 'casual', 'colours', 'fit', 'piece', 'weather'] as const;
export type AskReason = (typeof ASK_REASONS)[number];
export const ASK_REASONS_MAX = 3;

// Her answer to Robes' one question about a look (F5): unanswered, a thumbs up, a thumbs down.
export type Verdict = 'ask' | 'up' | 'down';

export type ThreadWho = 'her' | 'robes' | 'work' | 'filed';
export interface ThreadLine {
  id: number;
  who: ThreadWho;
  text: string;
}

export interface AdjustState {
  thread: ThreadLine[];
  // Changes to the rack since the model was last asked to wear it.
  pending: number;
  // "Dress it again" asked what's not right with it; her next words answer that.
  asking: boolean;
  // Robes' one question about the look as it stands ("How is this look?"), while it is open; her
  // thumb on it; and, after a thumbs down, what she tapped: reasons, or Restyle it all alone.
  question: string | null;
  verdict: Verdict | null;
  reasons: AskReason[];
  restyle: boolean;
  nextId: number;
}

const noQuestion = (): Pick<AdjustState, 'question' | 'verdict' | 'reasons' | 'restyle'> => ({
  question: null,
  verdict: null,
  reasons: [],
  restyle: false,
});

export const EMPTY_ADJUST: AdjustState = {
  thread: [],
  pending: 0,
  asking: false,
  ...noQuestion(),
  nextId: 1,
};

export type AdjustEvent =
  // A line of the thread. A work line ("Dressing it…") stands last and is replaced by the next
  // line of any kind; `settle` takes it away with nothing after it.
  | { type: 'her'; text: string }
  | { type: 'robes'; text: string }
  | { type: 'work'; text: string }
  | { type: 'filed'; text: string }
  | { type: 'settle' }
  // The rack changed (by the prompt or by hand): the picture falls one change behind.
  | { type: 'changed'; n?: number }
  // The model was asked to wear the rack (Update the model, Dress it again, Save): caught up.
  | { type: 'drawn' }
  // Dress it again asks; her answer closes the question.
  | { type: 'ask' }
  | { type: 'answered' }
  // Robes asks how the look is, once per returned look (F3, F19); her thumb answers it (F5), and
  // after a thumbs down she taps reasons, or Restyle it all alone (F8).
  | { type: 'question'; text: string }
  | { type: 'up' }
  | { type: 'down' }
  | { type: 'reason'; reason: AskReason }
  | { type: 'restyle' }
  | { type: 'reset' };

function withoutWork(thread: readonly ThreadLine[]): ThreadLine[] {
  const last = thread.at(-1);
  return last?.who === 'work' ? thread.slice(0, -1) : [...thread];
}

export function adjustReduce(state: AdjustState, event: AdjustEvent): AdjustState {
  switch (event.type) {
    case 'her': {
      // Her line answers the open question, thumb or no thumb (F16): the question joins the
      // thread above it and closes.
      const asked: ThreadLine[] = state.question
        ? [{ id: state.nextId, who: 'robes', text: state.question }]
        : [];
      const id = state.nextId + asked.length;
      return {
        ...state,
        ...noQuestion(),
        thread: [...withoutWork(state.thread), ...asked, { id, who: 'her', text: event.text }],
        nextId: id + 1,
      };
    }
    case 'robes':
    case 'filed':
    case 'work': {
      const line: ThreadLine = { id: state.nextId, who: event.type, text: event.text };
      return { ...state, thread: [...withoutWork(state.thread), line], nextId: state.nextId + 1 };
    }
    case 'question':
      // It stands apart from the thread, so a work line (the picture being drawn) stays.
      return {
        ...state,
        question: event.text,
        verdict: 'ask',
        reasons: [],
        restyle: false,
      };
    case 'up':
    case 'down':
      // One answer per question (F5).
      return state.verdict === 'ask' ? { ...state, verdict: event.type } : state;
    case 'reason': {
      if (state.verdict !== 'down') return state;
      const on = state.reasons.includes(event.reason);
      if (!on && state.reasons.length >= ASK_REASONS_MAX) return state;
      return {
        ...state,
        restyle: false,
        reasons: on
          ? state.reasons.filter((r) => r !== event.reason)
          : [...state.reasons, event.reason],
      };
    }
    case 'restyle':
      // Restyle it all stands alone (F8).
      return state.verdict === 'down' ? { ...state, restyle: !state.restyle, reasons: [] } : state;
    case 'settle':
      return { ...state, thread: withoutWork(state.thread) };
    case 'changed':
      return { ...state, pending: state.pending + (event.n ?? 1) };
    case 'drawn':
      return { ...state, pending: 0 };
    case 'ask':
      return { ...state, asking: true };
    case 'answered':
      return { ...state, asking: false };
    case 'reset':
      return { ...EMPTY_ADJUST, nextId: state.nextId };
  }
}

// What the look prompt is told of the exchange so far: her and Robes' lines, the last few.
export function threadHistory(
  thread: readonly ThreadLine[],
): { who: 'her' | 'robes'; text: string }[] {
  return thread
    .filter((l): l is ThreadLine & { who: 'her' | 'robes' } => l.who === 'her' || l.who === 'robes')
    .map(({ who, text }) => ({ who, text }))
    .slice(-ASK_THREAD_MAX);
}

// True while the thread's last line is work in progress.
export function isWorking(state: Pick<AdjustState, 'thread'>): boolean {
  return state.thread.at(-1)?.who === 'work';
}

// The reasons offered after a thumbs down (F8, F14): every one not yet picked, while there is
// room for another and Restyle it all is not picked. "Not for the weather" shows only while the
// look carries a weather.
export function openReasons(
  state: Pick<AdjustState, 'reasons' | 'restyle'>,
  opts: { weather: boolean },
): AskReason[] {
  if (state.restyle || state.reasons.length >= ASK_REASONS_MAX) return [];
  return ASK_REASONS.filter((r) => !state.reasons.includes(r) && (r !== 'weather' || opts.weather));
}

// Her choice as one bubble (F17): what she tapped, then her words in quotes, joined by a middle
// dot. Her words alone stand as she wrote them.
export function feedbackBubble(labels: readonly string[], text: string): string {
  const words = text.trim();
  if (labels.length === 0) return words;
  return [...labels, ...(words ? [`“${words}”`] : [])].join(' · ');
}
