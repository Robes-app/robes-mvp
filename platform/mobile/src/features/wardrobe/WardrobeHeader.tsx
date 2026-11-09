import { wardrobe as copy, you } from '@robes/copy';
import type { WardrobeLayout } from '@robes/core/wardrobe';
import {
  Button,
  fonts,
  IconButton,
  SegmentedControl,
  Tabs,
  Text as UiText,
} from '@robes/ui-native';
import { Text, View } from 'react-native';

// Owned · Wishlist · Shop: Shop stands disabled until the Shop PRD lands (plan R10). The Inbox is a
// notice that shows while a receipt waits.
export type Segment = 'pieces' | 'wishlist';
const TABS = [copy.segments.owned, copy.segments.wishlist, copy.segments.shop] as const;
type TabLabel = (typeof TABS)[number];
const labelOf = (s: Segment): TabLabel =>
  s === 'pieces' ? copy.segments.owned : copy.segments.wishlist;

// The tab's pinned toolbar (Front Door PRD rev 3 §7.1): underline tabs with their glyphs and the
// framed + at the right. Web twin: WardrobeHeader in app/src/components/wardrobe/wardrobe-header.tsx.
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
    <Tabs
      items={TABS}
      value={labelOf(segment)}
      onChange={(label) => onSegment(label === copy.segments.wishlist ? 'wishlist' : 'pieces')}
      icons={{
        [copy.segments.owned]: 'wardrobe',
        [copy.segments.wishlist]: 'heart',
        [copy.segments.shop]: 'bag',
      }}
      disabled={[copy.segments.shop]}
      trailing={
        <IconButton icon="plus" label={addLabel} onPress={onAdd} framed testID="wardrobe-add" />
      }
      testID="wardrobe-tabs"
    />
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
      <Button variant="outline" onPress={onOpen} testID="wardrobe-inbox-review">
        {you.receipts.review(pieces)}
      </Button>
    </View>
  );
}

// The count row: a FIXED 32pt, the count in italic serif and the grid | list toggle. The Filter
// moved into the row of chips above it (PRD §7.1).
export function CountRow({
  count,
  layout,
  onLayout,
}: {
  count: string | null;
  layout: WardrobeLayout;
  onLayout: (next: WardrobeLayout) => void;
}) {
  return (
    <View className="mt-3 mb-3 h-9 flex-row items-center justify-between gap-3 px-5">
      <UiText
        className="text-[19px] text-ink-faint"
        style={{ fontFamily: fonts.displayItalic }}
        accessibilityLiveRegion="polite"
      >
        {count ?? ''}
      </UiText>
      <LayoutToggle layout={layout} onLayout={onLayout} />
    </View>
  );
}

// The small grid | list control, the wardrobe's and The Rack's (Front Door PRD rev 3 §4.6).
export function LayoutToggle({
  layout,
  onLayout,
}: {
  layout: WardrobeLayout;
  onLayout: (next: WardrobeLayout) => void;
}) {
  return (
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
  );
}
