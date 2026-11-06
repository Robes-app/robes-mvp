import { Icon, type IconName } from '@robes/icons/native';
import { shadowNative } from '@robes/tokens';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { maxFontSizeMultiplier, typeStyle } from './scale';

export interface ActionDiscProps {
  icon: IconName;
  // One word, authored in sentence case ("Capture"); the style sets it in capitals.
  label: string;
  // What a reader hears when the word alone doesn't say it ("Capture a look for today").
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

const DISC = 56;

// Felix's ActionDisc: a 56pt `surface-sunk` disc on the disc shadow with a 19pt `ink-soft` glyph,
// its one-word label beneath in the label caps at 0.16em. The way into a look (Capture · Describe ·
// Pick) or onto it (Swap · Edit); never a primary commit. Twin of web ui action-disc.tsx.
export function ActionDisc({
  icon,
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
  testID,
}: ActionDiscProps) {
  const soft = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      className={cx('items-center gap-2', disabled && 'opacity-40')}
    >
      {({ pressed }) => (
        <>
          <View
            className="items-center justify-center rounded-pill bg-surface-sunk"
            style={[{ width: DISC, height: DISC, opacity: pressed ? 0.85 : 1 }, shadowNative.disc]}
          >
            <Icon name={icon} size={19} color={soft} />
          </View>
          <Text
            maxFontSizeMultiplier={maxFontSizeMultiplier.label}
            className="text-ink-muted"
            style={{ ...typeStyle('label'), letterSpacing: 1.44 }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// Two or three discs in a centred row, 12 apart, standing half over the photo's bottom edge.
export function ActionDiscs({
  children,
  className,
  testID,
}: {
  children: ReactNode;
  className?: string;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      className={cx('flex-row justify-center gap-3', className)}
      style={{ marginTop: -DISC / 2 }}
    >
      {children}
    </View>
  );
}
