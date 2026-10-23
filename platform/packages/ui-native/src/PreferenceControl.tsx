import { Icon } from '@robes/icons/native';
import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { MIN_TOUCH } from './scale';

// Avoid · no view · love. @robes/core/colour owns the `Preference` name; this is the same union.
type Pref = -1 | 0 | 1;

export interface PreferenceControlProps {
  label: string;
  value: Pref | null;
  onChange: (value: Pref) => void;
  labels: { avoid: string; none: string; love: string };
  // The family's answer, shown as an outline while a shade follows it.
  inherited?: Pref;
  size?: 'md' | 'sm';
  follows?: string;
  className?: string;
  testID?: string;
}

const ORDER: Pref[] = [-1, 0, 1];
const BOX = { md: { h: 44, w: 144, icon: 16, dot: 4 }, sm: { h: 32, w: 108, icon: 13, dot: 3 } };

// The palette's three-state control (legacy .pf-ctl): a track, three verbs, and the answer as the
// warm fill — never black; love is rose. A shade with no answer of its own sits on its family's
// answer as an OUTLINE: it follows, it hasn't been set.
export function PreferenceControl({
  label,
  value,
  onChange,
  labels,
  inherited = 0,
  size = 'md',
  follows,
  className,
  testID,
}: PreferenceControlProps) {
  const rose = useColor('accent-inspire');
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  const box = BOX[size];
  const following = value === null;
  const shown = following ? inherited : value;
  const verbs = [labels.avoid, labels.none, labels.love];
  const slop = (MIN_TOUCH - box.h) / 2;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={following && follows ? `${label}: following ${follows}` : label}
      testID={testID}
      style={{ height: box.h, width: box.w }}
      className={cx('flex-row rounded-pill border border-hairline bg-bg p-0.5', className)}
    >
      {ORDER.map((pref, index) => {
        const checked = pref === shown;
        const set = checked && !following;
        const colour = set ? (pref === 1 ? rose : ink) : faint;
        return (
          <Pressable
            key={pref}
            accessibilityRole="radio"
            accessibilityLabel={verbs[index]}
            accessibilityState={{ checked }}
            hitSlop={slop > 0 ? { top: slop, bottom: slop } : undefined}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(pref);
            }}
            className={cx(
              'flex-1 items-center justify-center rounded-pill',
              checked &&
                (following ? 'border border-ink-faint' : 'border border-selected-line bg-selected'),
            )}
          >
            {pref === 0 ? (
              <View
                style={{ width: box.dot, height: box.dot, backgroundColor: colour }}
                className="rounded-pill"
              />
            ) : (
              <Icon
                name={pref === -1 ? 'avoid' : 'heart'}
                size={box.icon}
                color={colour}
                filled={set && pref === 1}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
