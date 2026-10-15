import { View } from 'react-native';

// One dot per look, three at most: rose up to today, ink for a day still ahead (legacy ff87e89).
export function DayDots({ looks, past }: { looks: number; past: boolean }) {
  return (
    <View className="h-1.5 flex-row gap-1" importantForAccessibility="no-hide-descendants">
      {Array.from({ length: Math.min(3, looks) }, (_, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: identical dots
          key={i}
          className={`size-1.5 rounded-pill ${past ? 'bg-accent-inspire' : 'bg-ink'}`}
        />
      ))}
    </View>
  );
}
