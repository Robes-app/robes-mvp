'use client';

import type { Look } from '@robes/contracts';
import { useEffect, useRef } from 'react';
import { useRequestFrame } from '@/lib/look-states';
import { LookImage } from './look-image';
import { Scanning, scanningLine } from './scan-line';

// Robes' frame (drawn when she first reaches a suggestion, UX-09) or her look's picture.
export function LookPicture({ look }: { look: Look }) {
  const requestFrame = useRequestFrame();
  const asked = useRef(false);
  useEffect(() => {
    if (!look.image && look.setId && !look.framePending && !asked.current) {
      asked.current = true;
      requestFrame(look.id);
    }
  }, [look, requestFrame]);
  // The frame is scanned while it is drawn, so the page never rests on the bare pieces.
  const busy = scanningLine(look);
  return (
    <figure className="relative overflow-hidden rounded-crisp">
      <LookImage look={look} priority sizes="(min-width: 768px) 40vw, 100vw" />
      {busy ? <Scanning line={busy} corner /> : null}
    </figure>
  );
}
