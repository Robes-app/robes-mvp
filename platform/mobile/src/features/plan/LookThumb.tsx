import type { Look } from '@robes/contracts';
import { View } from 'react-native';
import { LookPhoto } from '../looks/LookTile';

// The look's photograph alone, at a row's scale — the tile's anatomy lives in LookTile.
export function LookThumb({ look, width }: { look: Look; width: number }) {
  return (
    <View style={{ width }} className="overflow-hidden rounded-[4px]">
      <LookPhoto look={look} width={width} />
    </View>
  );
}
