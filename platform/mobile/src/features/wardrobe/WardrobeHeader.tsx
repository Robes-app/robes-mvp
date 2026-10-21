import { wardrobe as copy } from '@robes/copy';
import type { WardrobeLayout } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/native';
import { fonts, MIN_TOUCH, SegmentedControl, useColor } from '@robes/ui-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

export type Segment = 'pieces' | 'wishlist' | 'inbox';
const SEGMENTS = [
  { value: 'pieces', label: copy.segments.pieces },
  { value: 'wishlist', label: copy.segments.wishlist },
  { value: 'inbox', label: copy.segments.inbox },
] as const;

// Row 1 of the one header (legacy a268ef0/809b13e): the 36pt track and the 36pt + circle.
export function HeaderRow({
  segment,
  onSegment,
  addLabel,
  onAdd,
}: {
  segment: Segment;
  onSegment: (s: Segment) => void;
  addLabel: string;
  onAdd: () => void;
}) {
  const ink = useColor('ink');
  return (
    <View className="flex-row items-center justify-between gap-4 px-6 pt-2">
      <SegmentedControl
        label={copy.title}
        options={SEGMENTS}
        value={segment}
        onChange={onSegment}
        className="flex-1"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        onPress={onAdd}
        hitSlop={(MIN_TOUCH - 36) / 2}
        testID="wardrobe-add"
        className="size-9 items-center justify-center rounded-pill border border-border-control"
      >
        <Icon name="plus" size={16} color={ink} />
      </Pressable>
    </View>
  );
}

// The category tabs: underline tabs on one hairline baseline, scrolling sideways.
export function CategoryTabs({
  categories,
  value,
  onChange,
}: {
  categories: readonly string[];
  value: string | null;
  onChange: (category: string | null) => void;
}) {
  const tabs: Array<{ key: string | null; label: string }> = [
    { key: null, label: copy.header.all },
    ...categories.map((c) => ({ key: c, label: c })),
  ];
  return (
    <View className="mt-5 px-6">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={copy.header.categories}
        contentContainerClassName="gap-[22px] border-b border-hairline"
      >
        {tabs.map((t) => {
          const on = t.key === value;
          return (
            <Pressable
              key={t.key ?? 'all'}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: on }}
              onPress={() => onChange(t.key)}
              style={{ minHeight: MIN_TOUCH, marginBottom: -1 }}
              className={`justify-center border-b ${on ? 'border-ink' : 'border-transparent'}`}
            >
              <Text
                className={`text-[13px] ${on ? 'text-ink' : 'text-ink-muted'}`}
                style={{ fontFamily: fonts.sans }}
              >
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// The count row: a FIXED 32pt, the count in italic serif, Filter and the grid | list toggle.
export function CountRow({
  count,
  filter,
  layout,
  onLayout,
}: {
  count: string | null;
  filter?: { on: boolean; onOpen: () => void };
  layout: WardrobeLayout;
  onLayout: (next: WardrobeLayout) => void;
}) {
  const muted = useColor('ink-muted');
  return (
    <View className="mt-5 mb-3 h-8 flex-row items-center justify-between gap-3 px-6">
      <Text
        className="text-[19px] text-ink-faint"
        style={{ fontFamily: fonts.displayRegularItalic }}
        accessibilityLiveRegion="polite"
      >
        {count ?? ''}
      </Text>
      <View className="flex-row items-center gap-2">
        {filter ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.header.filter}
            accessibilityState={{ selected: filter.on }}
            onPress={filter.onOpen}
            hitSlop={6}
            testID="wardrobe-filter"
            className={`h-8 flex-row items-center gap-2 rounded-pill border px-3.5 ${
              filter.on ? 'border-border-control bg-surface-sunk' : 'border-hairline bg-bg'
            }`}
          >
            <Icon name="filter" size={14} color={muted} />
            <Text className="text-xs text-ink-muted" style={{ fontFamily: fonts.sans }}>
              {copy.header.filter}
            </Text>
          </Pressable>
        ) : null}
        <SegmentedControl
          size="sm"
          label={copy.header.layout}
          options={[
            { value: 'grid', label: copy.header.grid, icon: 'grid' },
            { value: 'list', label: copy.header.list, icon: 'list' },
          ]}
          value={layout}
          onChange={onLayout}
        />
      </View>
    </View>
  );
}
