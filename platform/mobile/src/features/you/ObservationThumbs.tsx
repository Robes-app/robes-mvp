import type { Observation } from '@robes/contracts';
import { twin } from '@robes/copy';
import { IconButton } from '@robes/ui-native';
import { View } from 'react-native';
import { useDnaMutations } from './dna';

const copy = twin.observations;

// An observation is hers to confirm: thumbs up files it under her Style DNA, down strikes it.
export function ObservationThumbs({ line }: { line: Observation }) {
  const { keep, dismiss } = useDnaMutations();
  const busy = keep.isPending || dismiss.isPending;
  return (
    <View className="flex-row items-center gap-2">
      <IconButton
        icon="thumbsUp"
        className="border border-border-control"
        disabled={busy}
        label={copy.answer(copy.keep, line.text)}
        onPress={() => keep.mutate({ params: { id: line.id } })}
      />
      <IconButton
        icon="thumbsDown"
        className="border border-border-control"
        disabled={busy}
        label={copy.answer(copy.notMe, line.text)}
        onPress={() => dismiss.mutate({ params: { id: line.id } })}
      />
    </View>
  );
}
