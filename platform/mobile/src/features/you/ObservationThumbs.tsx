import type { Observation } from '@robes/contracts';
import { twin } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { useColor } from '@robes/ui-native';
import { Pressable, View } from 'react-native';
import { useDnaMutations } from './dna';

const copy = twin.observations;

// An observation is hers to confirm: thumbs up files it under her Style DNA, down strikes it.
export function ObservationThumbs({ line }: { line: Observation }) {
  const { keep, dismiss } = useDnaMutations();
  const busy = keep.isPending || dismiss.isPending;
  const muted = useColor('ink-muted');
  const thumb = (icon: 'thumbsUp' | 'thumbsDown', label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      hitSlop={7}
      className="h-[30px] w-[30px] items-center justify-center rounded-pill border border-rule-mid"
      style={{ opacity: busy ? 0.5 : 1 }}
    >
      <Icon name={icon} color={muted} size={14} />
    </Pressable>
  );
  // Two 30pt hairline circles at the card's foot, right (each a 44pt target); web twin
  // app/src/components/observation-thumbs.tsx.
  return (
    <View className="flex-row items-center justify-end gap-3.5">
      {thumb('thumbsUp', copy.answer(copy.keep, line.text), () =>
        keep.mutate({ params: { id: line.id } }),
      )}
      {thumb('thumbsDown', copy.answer(copy.notMe, line.text), () =>
        dismiss.mutate({ params: { id: line.id } }),
      )}
    </View>
  );
}
