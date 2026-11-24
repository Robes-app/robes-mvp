import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { nativeSheet } from './StylingCard';

// iOS presents nothing over the dock's own sheet still on screen (Annie, 18 Nov: ✕ did nothing
// with the bar up). While the screen wants to present something of its own, or is not the one in
// view, the sheet steps aside and keeps its state; what wanted to present (`gate`) waits until it
// has gone. Leaving the screen (`putAwayThen`) puts the dock away to the sparkle first. Shared by the
// draft and saved look (DraftLook.tsx) and the bar on a piece's page (PieceStyle.tsx).
export function useDockYield(wants: boolean, putAway: () => void) {
  const [sheetUp, setSheetUp] = useState(false);
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const after = useRef<(() => void) | null>(null);
  const up = nativeSheet() && sheetUp;
  return {
    covered: wants || !focused,
    gate: (open: boolean) => open && !up,
    onSheetUp: (next: boolean) => {
      setSheetUp(next);
      if (next || !after.current) return;
      const then = after.current;
      after.current = null;
      then();
    },
    putAwayThen: (then: () => void) => {
      if (!up) {
        then();
        return;
      }
      after.current = then;
      putAway();
    },
  };
}
