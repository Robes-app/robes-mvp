import { Icon, type IconName } from '@robes/icons/native';
import { Pressable, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { MIN_TOUCH } from './scale';
import { Text } from './Text';

export interface IconToggleProps {
  icon: IconName;
  checked: boolean;
  onChange: (next: boolean) => void;
  // What a reader hears for each state, since a glyph alone says nothing
  // ("Shop is on: looks can add wishlist and new pieces").
  labelOn: string;
  labelOff: string;
  // Off and unavailable (her wardrobe is empty): drawn faded, still pressable so a tap can say why.
  faded?: boolean;
  disabled?: boolean;
  // Shown beside the glyph as a labelled pill (the docked prompt before her first send, K4).
  label?: string;
  className?: string;
  testID?: string;
}

const DISC = 28;

// The prompt's source toggles (look prompt PRD S1, P7, P8): a 28pt disc with one glyph inside a
// 44pt target. On: the sunk cream on the umber ring. Off: clear on the warm line (redline 14 Nov). Twin
// of web ui icon-toggle.tsx. With a `label` it is a pill: the glyph and the name.
export function IconToggle({
  icon,
  checked,
  onChange,
  labelOn,
  labelOff,
  faded = false,
  disabled = false,
  label,
  className,
  testID,
}: IconToggleProps) {
  const ink = useColor('ink');
  const muted = useColor(label ? 'ink-muted' : 'ink-faint');
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={checked ? labelOn : labelOff}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      testID={testID}
      style={{
        minWidth: MIN_TOUCH,
        minHeight: MIN_TOUCH,
        marginHorizontal: label ? 0 : -(MIN_TOUCH - DISC) / 2,
        opacity: disabled || faded ? 0.45 : 1,
      }}
      className={cx('items-center justify-center', className)}
    >
      <View
        testID={testID ? `${testID}-disc` : undefined}
        className={cx(
          'items-center justify-center rounded-pill',
          checked ? 'border-token-line bg-surface-sunk' : 'border-warm-line',
        )}
        style={
          label
            ? {
                height: DISC,
                borderWidth: 1,
                flexDirection: 'row',
                gap: 6,
                paddingLeft: 10,
                paddingRight: 12,
              }
            : { width: DISC, height: DISC, borderWidth: 1 }
        }
      >
        <Icon name={icon} size={15} color={checked ? ink : muted} />
        {label ? (
          <Text aria-hidden style={{ fontSize: 13, color: checked ? ink : muted }}>
            {label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
