import { wardrobe as copy, you } from '@robes/copy';
import type { WardrobeLayout } from '@robes/core/wardrobe';
import { Icon } from '@robes/icons/native';
import { Button, fonts, IconButton, MIN_TOUCH, SegmentedControl, useColor } from '@robes/ui-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

// Pieces | Wishlist only: the Inbox is a notice that shows while a receipt waits (Native parity).
export type Segment = 'pieces' | 'wishlist';
const SEGMENTS = [
  { value: 'pieces', label: copy.segments.wardrobe },
  { value: 'wishlist', label: copy.segments.wishlist },
] as const;

// The tab's pinned toolbar (beta's header row): the segmented track and the framed + circle.
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
  return (
    <View className="flex-row items-center justify-between gap-4">
      <SegmentedControl
        label={copy.title}
        options={SEGMENTS}
        value={segment}
        onChange={onSegment}
      />
      <IconButton icon="plus" label={addLabel} onPress={onAdd} framed testID="wardrobe-add" />
    </View>
  );
}

// Shown only while a forwarded receipt waits (beta's receipt notice, Add Piece redline 05b): a
// cream card on a hairline that says what Robes read, and one hairline pill into the Inbox.
// Web twin: InboxNotice in app/src/components/wardrobe/wardrobe-header.tsx.
export function InboxNotice({
  receipts,
  pieces,
  onOpen,
}: {
  receipts: number;
  pieces: number;
  onOpen: () => void;
}) {
  return (
    <View
      testID="wardrobe-inbox-notice"
      className="mx-5 mt-3 flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-soft border border-hairline bg-surface py-2.5 pr-2.5 pl-4"
    >
      <Text className="shrink text-[13px] text-ink-muted" style={{ fontFamily: fonts.sans }}>
        {`${copy.inbox.notice(receipts)} · ${you.receipts.waiting(pieces)}`}
      </Text>
      <Button variant="secondary" onPress={onOpen} testID="wardrobe-inbox-review">
        {you.receipts.review(pieces)}
      </Button>
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
    <View className="mt-3.5 border-b border-hairline pl-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={copy.header.categories}
        contentContainerClassName="gap-5 pr-5"
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
              style={{ minHeight: MIN_TOUCH, borderBottomWidth: 1.5, marginBottom: -1 }}
              className={`justify-center ${on ? 'border-ink' : 'border-transparent'}`}
            >
              <Text
                className={`text-[13px] ${on ? 'text-ink' : 'text-ink-muted'}`}
                style={{ fontFamily: on ? fonts.sansMedium : fonts.sans }}
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
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  return (
    <View className="mt-3.5 mb-3.5 h-9 flex-row items-center justify-between gap-3 px-5">
      <Text
        className="text-[19px] text-ink-faint"
        style={{ fontFamily: fonts.displayItalic }}
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
            hitSlop={(MIN_TOUCH - 36) / 2}
            testID="wardrobe-filter"
            className={`h-9 flex-row items-center gap-1.5 rounded-pill border bg-surface-raised px-3 ${
              filter.on ? 'border-selected-line' : 'border-rule-mid'
            }`}
          >
            <Icon name="filter" size={14} color={filter.on ? ink : muted} />
            <Text
              className={`text-xs ${filter.on ? 'text-ink' : 'text-ink-muted'}`}
              style={{ fontFamily: fonts.sans }}
            >
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
