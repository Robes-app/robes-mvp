import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { Text } from '@robes/ui';

// The scanner (legacy 0.5): a rose line sweeping over the piece while its looks compose. Under
// reduced motion it stands still at the top.
export function ScanLine() {
  return (
    <span
      aria-hidden
      data-testid="scan-line"
      className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-accent-inspire shadow-[0_0_14px_4px_color-mix(in_oklab,var(--color-accent-inspire)_35%,transparent)] motion-safe:animate-scan"
    />
  );
}

// What a frame still being drawn says: a swap re-writes the look, else Robes is drawing it. Null
// once the frame has landed. One rule for the tile and the look's own picture.
export function scanningLine(look: Look, swapping = false): string | null {
  if (swapping) return copy.suggestedTile.restyling;
  if (look.framePending) return copy.suggestedTile.restyling;
  return !look.image && look.setId ? copy.suggestedTile.framing : null;
}

// The sweep plus its line, over the frame: a card never rests on the bare piece or prompt.
// `corner` sits it bottom-left of a large frame; the default centres it on a tile.
export function Scanning({ line, corner = false }: { line: string; corner?: boolean }) {
  return (
    <>
      <ScanLine />
      <span
        className={`pointer-events-none absolute ${corner ? 'bottom-2.5 left-2.5' : 'inset-0 flex items-center justify-center'}`}
      >
        <Text
          as="span"
          size="caption"
          tone="muted"
          className="rounded-pill border border-hairline bg-bg/90 px-2.5 py-1"
        >
          {line}
        </Text>
      </span>
    </>
  );
}
