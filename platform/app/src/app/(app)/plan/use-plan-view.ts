'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type PlanViewKind = 'list' | 'month';

const KEY = 'robes.plan.view';
const listeners = new Set<() => void>();
// This visit's pick, so the toggle works even where storage is blocked.
let picked: PlanViewKind | null = null;

const isView = (v: unknown): v is PlanViewKind => v === 'list' || v === 'month';

function read(): PlanViewKind {
  if (picked) return picked;
  try {
    const stored = window.localStorage.getItem(KEY);
    if (isView(stored)) return stored;
  } catch {
    // Private mode or blocked storage: the Diary opens on its list.
  }
  return 'list';
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

// List | Month, kept per viewer (D4; native twin mobile/src/features/plan/PlanView.tsx). Null
// until the browser has read it, so the server never renders the wrong view's days.
export function usePlanView(): [PlanViewKind | null, (next: PlanViewKind) => void] {
  const view = useSyncExternalStore(subscribe, read, () => null);
  const set = useCallback((next: PlanViewKind) => {
    picked = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Still switches for this visit.
    }
    for (const l of listeners) l();
  }, []);
  return [view, set];
}
