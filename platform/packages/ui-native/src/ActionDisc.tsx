import { Icon, type IconName } from '@robes/icons/native';
import { shadowNative } from '@robes/tokens';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { usePrimaryGuard } from './Button';
import { useColor } from './color';
import { cx } from './cx';
import { fonts, maxFontSizeMultiplier, typeStyle } from './scale';

interface Base {
  // One word, authored in sentence case ("Capture"); the style sets it in capitals.
  label: string;
  // What a reader hears when the word alone doesn't say it ("Capture a look for today").
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

// A cream disc names its glyph; the primary (home's Create) defaults to the sparkle.
export type ActionDiscProps = Base &
  ({ primary?: false; icon: IconName } | { primary: true; icon?: IconName });

const DISC = 56;
const PRIMARY_DISC = 66;
const PRIMARY_SLOT = 80;
// The primary's face is 10 taller than a cream one; raised by that, its foot meets theirs.
const PRIMARY_RAISE = PRIMARY_DISC - DISC;

// Felix's ActionDisc: a 56pt `surface-sunk` disc on the disc shadow with a 19pt `ink-soft` glyph,
// its one-word label beneath in the label caps at 0.16em. The way into a look (Capture · Create ·
// Pick) or onto it (Swap · Edit); never a primary commit. `primary` is home's Create: a 66pt ink
// face with a 23pt cream glyph at a 1.4 stroke, an ink SemiBold label, in an 80pt slot raised 10
// so its foot meets its neighbours'. It is the screen's one ink action (Annie, 13 Nov).
// Twin of web ui action-disc.tsx.
export function ActionDisc(props: ActionDiscProps) {
  const { label, accessibilityLabel, onPress, disabled = false, testID, primary = false } = props;
  const icon = props.icon ?? 'describe';
  // The primary disc is a filled ink control: it counts against the one per screen (UX-26).
  usePrimaryGuard(primary);
  const soft = useColor('ink-muted');
  const cream = useColor('bg');
  const size = primary ? PRIMARY_DISC : DISC;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      className={cx('items-center gap-2', disabled && 'opacity-40')}
      style={primary ? { width: PRIMARY_SLOT, marginTop: -PRIMARY_RAISE } : undefined}
    >
      {({ pressed }) => (
        <>
          <View
            className={cx(
              'items-center justify-center rounded-pill',
              primary ? 'bg-ink' : 'bg-surface-sunk',
            )}
            style={[
              { width: size, height: size, opacity: pressed ? 0.85 : 1 },
              primary ? shadowNative['disc-primary'] : shadowNative.disc,
            ]}
          >
            {primary ? (
              <Icon name={icon} size={23} color={cream} stroke={1.4} />
            ) : (
              <Icon name={icon} size={19} color={soft} />
            )}
          </View>
          <Text
            maxFontSizeMultiplier={maxFontSizeMultiplier.label}
            className={primary ? 'text-ink' : 'text-ink-muted'}
            style={{
              ...typeStyle('label'),
              letterSpacing: 1.44,
              ...(primary ? { fontFamily: fonts.sansSemiBold } : null),
            }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// Two or three discs in a centred row, 28 apart, standing half over the photo's bottom edge
// (Felix `.fx-discs`).
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
      className={cx('flex-row items-start justify-center gap-7', className)}
      style={{ marginTop: -DISC / 2 }}
    >
      {children}
    </View>
  );
}
