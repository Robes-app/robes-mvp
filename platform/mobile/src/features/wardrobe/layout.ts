import { defaultLayout, isWardrobeLayout, type WardrobeLayout } from '@robes/core/wardrobe';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';

// Her pick, kept on this phone and shared by the wardrobe and the wishlist (legacy rb_wa_layout;
// web twin: app/src/components/wardrobe/use-layout.ts, in localStorage). SecureStore is the
// device store the app already carries; the pick is no secret.
const KEY = 'robes.wardrobe.layout';
let picked: WardrobeLayout | null = null;

function stored(): WardrobeLayout | null {
  try {
    const value = SecureStore.getItem(KEY);
    return isWardrobeLayout(value) ? value : null;
  } catch {
    // Unavailable store: the phone default, and her pick for this session.
    return null;
  }
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
      SecureStore.setItemAsync(KEY, next).catch(() => {
        // Still switches for this session.
      });
    },
  ];
}
