// The adjust thread (Front Door design 3b, plan 2026-11-03 §1.1 and §1.4): what she and Robes say
// while a look is worked on through the prompt — on home's box and on the look's page alike — and
// how many changes the picture has not caught up with. Pure; web and native drive it the same
// way. Nothing here is ever stored: a page load starts a fresh thread.

import { ASK_THREAD_MAX } from './index';

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
  nextId: number;
}

export const EMPTY_ADJUST: AdjustState = { thread: [], pending: 0, asking: false, nextId: 1 };

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
  | { type: 'reset' };

function withoutWork(thread: readonly ThreadLine[]): ThreadLine[] {
  const last = thread.at(-1);
  return last?.who === 'work' ? thread.slice(0, -1) : [...thread];
}

export function adjustReduce(state: AdjustState, event: AdjustEvent): AdjustState {
  switch (event.type) {
    case 'her':
    case 'robes':
    case 'filed':
    case 'work': {
      const line: ThreadLine = { id: state.nextId, who: event.type, text: event.text };
      return { ...state, thread: [...withoutWork(state.thread), line], nextId: state.nextId + 1 };
    }
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
