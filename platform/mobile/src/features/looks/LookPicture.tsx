import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { Image, Skeleton, Text } from '@robes/ui-native';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { renditionUri } from '@/lib/images';
import { useRequestFrame } from './look-states';
import { Scanning, scanningLine } from './ScanLine';

export function LookPicture({ look }: { look: Look }) {
  const requestFrame = useRequestFrame();
  const asked = useRef(false);
  // A suggestion's frame is drawn when she first reaches it (UX-09).
  useEffect(() => {
    if (!look.image && look.setId && !look.framePending && !asked.current) {
      asked.current = true;
      requestFrame(look.id);
    }
  }, [look, requestFrame]);
  const uri = renditionUri(look.image, 360);
  // The frame is scanned while it is drawn, so the page never rests on the bare pieces.
  const busy = scanningLine(look);
  return (
    <View className="overflow-hidden rounded-crisp">
      {uri ? (
        <Image source={uri} alt={copy.prompt.label(look.name)} blurhash={look.image?.blurhash} />
      ) : (
        <Skeleton width="100%" aspectRatio={4 / 5} />
      )}
      {busy ? <Scanning line={busy} corner /> : null}
    </View>
  );
}

// The text block over a look's picture (Front Door design 3b, plan 2026-11-03 §1.3): what the look
// is made of — hers, and the pieces to find — with Robes' hand named when it composed the look.
// Web twin: components/looks/look-page.tsx LookMix.
export function LookMix({
  yours,
  toFind,
  composed,
}: {
  yours: number;
  toFind: number;
  composed: boolean;
}) {
  const line = { fontSize: 9, letterSpacing: 1.8 };
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text size="caption" tone="muted" className="uppercase" style={line}>
        {copy.mix(yours, toFind)}
      </Text>
      {composed ? (
        <Text size="caption" tone="muted" className="uppercase" style={line}>
          {copy.composedByRobes}
        </Text>
      ) : null}
    </View>
  );
}
