import { defaultLayout, type WardrobeLayout } from '@robes/core/wardrobe';
import { useState } from 'react';

// Her pick for this session, shared by the wardrobe and the wishlist (legacy rb_wa_layout).
let picked: WardrobeLayout | null = null;

// The phone opens on the list until she picks.
export function useWardrobeLayout(): [WardrobeLayout, (next: WardrobeLayout) => void] {
  const [layout, setLayout] = useState<WardrobeLayout>(picked ?? defaultLayout(true));
  return [
    layout,
    (next) => {
      picked = next;
      setLayout(next);
    },
  ];
}
