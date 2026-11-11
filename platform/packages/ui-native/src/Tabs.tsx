import { Icon, type IconName } from '@robes/icons/native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColor } from './color';
import { cx } from './cx';
import { FINE_EDGE, fonts, MIN_TOUCH, maxFontSizeMultiplier, typeStyle } from './scale';

export interface TabsProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (item: T) => void;
  // A 12pt glyph before a tab's label (the Lookbook's bookmark and sparkle, the Wardrobe's
  // hanger, heart and bag). Front Door PRD rev 3 §2.4.
  icons?: Partial<Record<T, IconName>>;
  // A count after a tab's label, lighter ("INBOX 13").
  counts?: Partial<Record<T, number>>;
  // Tabs that are shown but not yet open (the Wardrobe's SHOP until the Shop PRD lands): 45%,
  // no press, announced as disabled.
  disabled?: readonly T[];
  // What sits at the rail's right end: the ink + that adds to the tab.
  trailing?: ReactNode;
  className?: string;
  testID?: string;
}

// Felix's Tabs: an underline rail (Pieces · Details), 44pt tall on a 0.5pt `hairline` baseline,
// left-aligned; each tab 0 16 in the `label` caps, `ink-soft`, the selected one `ink` on a 1.5pt
// ink underline. Two to four tabs; a leading glyph, a count and a trailing control where a screen
// header asks for them. Twin of web ui tabs.tsx.
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  icons,
  counts,
  disabled,
  trailing,
  className,
  testID,
}: TabsProps<T>) {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const label = typeStyle('label');
  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      className={cx('flex-row items-center border-hairline', className)}
      style={{ borderBottomWidth: FINE_EDGE }}
    >
      {items.map((item) => {
        const selected = item === value;
        const off = disabled?.includes(item) === true;
        const icon = icons?.[item];
        const count = counts?.[item];
        return (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityLabel={count === undefined ? item : `${item} ${count}`}
            // `disabled` stays out of Pressable's props: it would stamp every state key on the
            // node, and a reader only needs to hear disabled on a tab that is.
            accessibilityState={off ? { selected, disabled: true } : { selected }}
            onPress={() => {
              if (!off && !selected) onChange(item);
            }}
            style={{ minHeight: MIN_TOUCH, opacity: off ? 0.45 : 1 }}
            className="flex-row items-center justify-center gap-1.5 px-4"
          >
            {icon ? <Icon name={icon} size={12} color={selected ? ink : muted} /> : null}
            <Text
              maxFontSizeMultiplier={maxFontSizeMultiplier.label}
              className={selected ? 'text-ink' : 'text-ink-muted'}
              style={label}
            >
              {item}
            </Text>
            {count !== undefined ? (
              <Text
                maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                className="text-ink-faint"
                style={{ fontFamily: fonts.sansRegular, fontSize: label.fontSize }}
              >
                {count}
              </Text>
            ) : null}
            {selected ? (
              <View className="absolute right-0 bottom-0 left-0 bg-ink" style={{ height: 1.5 }} />
            ) : null}
          </Pressable>
        );
      })}
      {trailing ? <View className="ml-auto flex-row items-center pr-1">{trailing}</View> : null}
    </View>
  );
}
