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
    <View className="gap-1">
      <View className="overflow-hidden rounded-crisp">
        {uri ? (
          <Image source={uri} alt={copy.prompt.label(look.name)} blurhash={look.image?.blurhash} />
        ) : (
          <Skeleton width="100%" aspectRatio={4 / 5} />
        )}
        {busy ? <Scanning line={busy} corner /> : null}
      </View>
      {!busy && look.composedByRobes ? (
        <Text size="caption" tone="faint" className="self-end">
          {copy.composedByRobes}
        </Text>
      ) : null}
    </View>
  );
}
