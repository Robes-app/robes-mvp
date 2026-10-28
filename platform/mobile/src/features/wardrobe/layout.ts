import { defaultLayout, isWardrobeLayout, type WardrobeLayout } from '@robes/core/wardrobe';
import { useState } from 'react';
import { readPrefNow, writePref } from '@/lib/prefs';

// Her pick, kept on this phone and shared by the wardrobe and the wishlist (legacy rb_wa_layout;
// web twin: app/src/components/wardrobe/use-layout.ts, in localStorage), through the app's one
// per-viewer store (lib/prefs).
const KEY = 'robes.wardrobe.layout';
let picked: WardrobeLayout | null = null;

function stored(): WardrobeLayout | null {
  const value = readPrefNow(KEY);
  return isWardrobeLayout(value) ? value : null;
}

// The phone opens on the list until she picks.
export function useWardrobeLayout(): [WardrobeLayout, (next: WardrobeLayout) => void] {
  const [layout, setLayout] = useState<WardrobeLayout>(() => {
    picked = picked ?? stored();
    return picked ?? defaultLayout(true);
  });
  return [
    layout,
    (next) => {
      picked = next;
      setLayout(next);
      void writePref(KEY, next);
    },
  ];
}
