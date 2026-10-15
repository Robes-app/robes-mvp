'use client';

import { defaultLayout, isWardrobeLayout, type WardrobeLayout } from '@robes/core/wardrobe';
import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'robes.wardrobe.layout';
const PHONE = '(max-width: 767px)';
const listeners = new Set<() => void>();
// This visit's pick, so the toggle works even where storage is blocked.
let picked: WardrobeLayout | null = null;

function read(): WardrobeLayout {
  if (picked) return picked;
  try {
    const stored = window.localStorage.getItem(KEY);
    if (isWardrobeLayout(stored)) return stored;
  } catch {
    // Private mode or blocked storage: fall back to the device default.
  }
  return defaultLayout(window.matchMedia(PHONE).matches);
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

// Grid | list per device (legacy rb_wa_layout): the phone opens on the list, the web on the grid.
export function useWardrobeLayout(): [WardrobeLayout | null, (next: WardrobeLayout) => void] {
  const layout = useSyncExternalStore(subscribe, read, () => null);
  const set = useCallback((next: WardrobeLayout) => {
    picked = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Still switches for this visit.
    }
    for (const l of listeners) l();
  }, []);
  return [layout, set];
}
