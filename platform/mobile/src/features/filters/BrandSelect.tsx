import { wardrobe as copy } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { FINE_EDGE, fonts, MIN_TOUCH, useColor } from '@robes/ui-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

// The Front Door's BRAND select (PRD rev 3 §7.1a): a white field reading the brand in play ("All
// brands" at rest) with an up-down chevron; a tap opens the list beneath — All brands, then every
// brand A–Z, the current one ticked — and a pick closes it. One brand at a time. Twin of web
// components/filters/brand-select.tsx.
export function BrandSelect({
  brands,
  value,
  onChange,
}: {
  brands: readonly string[];
  value: string | null;
  onChange: (brand: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const pick = (brand: string | null) => {
    onChange(brand);
    setOpen(false);
  };
  const options: Array<{ key: string; label: string; brand: string | null }> = [
    { key: 'all', label: copy.filter.allBrands, brand: null },
    ...brands.map((b) => ({ key: b, label: b, brand: b })),
  ];
  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.filter.brand}
        accessibilityValue={{ text: value ?? copy.filter.allBrands }}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={{ minHeight: MIN_TOUCH, borderWidth: FINE_EDGE }}
        className="flex-row items-center justify-between rounded-sm border-rule-mid bg-surface-raised px-3.5"
        testID="brand-select"
      >
        <Text className="text-ink" style={{ fontFamily: fonts.sansRegular, fontSize: 13 }}>
          {value ?? copy.filter.allBrands}
        </Text>
        <Icon name={open ? 'down' : 'sort'} size={14} color={muted} />
      </Pressable>
      {open ? (
        <View
          accessibilityLabel={copy.filter.brands}
          className="rounded-sm border-rule-mid bg-surface-raised"
          style={{ borderWidth: FINE_EDGE }}
        >
          {options.map((option, i) => {
            const on = option.brand === value;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: on }}
                onPress={() => pick(option.brand)}
                style={{ minHeight: MIN_TOUCH }}
                className={`flex-row items-center justify-between px-3.5 ${
                  i === 0 ? '' : 'border-hairline border-t'
                }`}
              >
                <Text
                  className="text-ink"
                  style={{ fontFamily: on ? fonts.sansMedium : fonts.sansRegular, fontSize: 13 }}
                >
                  {option.label}
                </Text>
                {on ? <Icon name="check" size={14} color={ink} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
