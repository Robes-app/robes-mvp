import { Pressable, Text, View } from 'react-native';
import { cx } from './cx';
import { FINE_EDGE, MIN_TOUCH, maxFontSizeMultiplier, typeStyle } from './scale';

export interface TabsProps<T extends string> {
  items: readonly T[];
  value: T;
  onChange: (item: T) => void;
  className?: string;
  testID?: string;
}

// Felix's Tabs: an underline rail (Pieces · Details), 44pt tall on a 0.5pt `hairline` baseline,
// left-aligned; each tab 0 16 in the `label` caps, `ink-soft`, the selected one `ink` on a 1.5pt
// ink underline. Two to four tabs, never icons. Twin of web ui tabs.tsx.
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  testID,
}: TabsProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      testID={testID}
      className={cx('flex-row border-hairline', className)}
      style={{ borderBottomWidth: FINE_EDGE }}
    >
      {items.map((item) => {
        const selected = item === value;
        return (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityLabel={item}
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) onChange(item);
            }}
            style={{ minHeight: MIN_TOUCH }}
            className="justify-center px-4"
          >
            <Text
              maxFontSizeMultiplier={maxFontSizeMultiplier.label}
              className={selected ? 'text-ink' : 'text-ink-muted'}
              style={typeStyle('label')}
            >
              {item}
            </Text>
            {selected ? (
              <View className="absolute right-0 bottom-0 left-0 bg-ink" style={{ height: 1.5 }} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
