import { ui } from '@robes/copy';
import { View } from 'react-native';
import { cx } from './cx';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

export interface ProgressProps {
  // Current stage in her words, from @robes/copy (e.g. jobs.status.running).
  stage?: string;
  // Per-image fill: segments light up as images arrive. Omit both for the text-only stage.
  total?: number;
  done?: number;
  className?: string;
  testID?: string;
}

export function Progress({
  stage = ui.progress.styling,
  total,
  done = 0,
  className,
  testID,
}: ProgressProps) {
  const count = total && total > 0 ? total : 0;
  const filled = Math.min(Math.max(done, 0), count);
  const segments = Array.from({ length: count }, (_, i) => ({
    id: `segment-${i}`,
    on: i < filled,
  }));
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={stage}
      accessibilityValue={
        count
          ? { min: 0, max: count, now: filled, text: ui.progress.images(filled, count) }
          : undefined
      }
      accessibilityState={{ busy: !count || filled < count }}
      className={cx('gap-3', className)}
    >
      <Text tone="muted">{stage}</Text>
      {count ? (
        <View className="flex-row gap-1">
          {segments.map((segment) =>
            segment.on ? (
              <View key={segment.id} className="h-1 flex-1 rounded-pill bg-ink" />
            ) : (
              <Skeleton key={segment.id} shape="circle" height={4} className="flex-1" />
            ),
          )}
        </View>
      ) : null}
    </View>
  );
}
