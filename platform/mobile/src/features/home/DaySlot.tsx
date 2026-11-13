import type { DiaryDay, Model, PlanEntry } from '@robes/contracts';
import { diary as copy, lookbook } from '@robes/copy';
import { dayOotd } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import {
  ActionDisc,
  ActionDiscs,
  ASPECTS,
  Image,
  MIN_TOUCH,
  maxFontSizeMultiplier,
  Skeleton,
  Text,
  typeStyle,
  useColor,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text as RNText, ScrollView, useWindowDimensions, View } from 'react-native';
import { LookTile } from '@/features/looks/LookTile';
import { ImageStack } from '@/features/looks/SavedLook';
import { DraftTile } from './DraftTile';
import { fitPageWidth, PHOTO_RATIO } from './diary';
import { ModelStack } from './ModelStack';

// The page's own gutter: each page is the content width, one whole page at a time.
const PAGE = 20;

export interface DayActions {
  // Into a look (the last page): her photograph, her words (today and ahead only), her lookbook.
  onCapture: () => void;
  onDescribe: (() => void) | null;
  onPick: () => void;
  // Onto a look: Swap from the lookbook, Edit on its page, × off the day.
  onSwap: (entry: PlanEntry) => void;
  onEdit: (entry: PlanEntry) => void;
  onRemove: (entry: PlanEntry) => void;
  // The model under the day's looks (Felix ModelStack → ModelPicker, D10).
  onModel: () => void;
}

// The day on home (Felix 3a · 3k, D7): one page per look — the OOTD first, then the others — each
// the content width on the tile radius, Swap · Edit standing half over its foot and its name
// beneath; then the draft Robes is making for the day; and last her model with Capture · Create
// · Pick, the way into another look (on an empty day the only page). Pager dots when there is
// more than one. The web twin is components/home/day-slot.tsx.
export function DaySlot({
  day,
  today,
  dayWord,
  justSaved = null,
  model,
  actions,
  room = null,
}: {
  day: DiaryDay;
  today: string;
  // 'today' or the weekday, for the labels.
  dayWord: string;
  // The look just saved from the draft: its page says so for a moment.
  justSaved?: string | null;
  model: Model | undefined;
  actions: DayActions;
  // The height the slot may take before Home would scroll (DiaryHome measures it).
  room?: number | null;
}) {
  const router = useRouter();
  const window = useWindowDimensions();
  // What stands under the photograph: the slot's height less the photo's, measured once laid out.
  const [tail, setTail] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const ootd = dayOotd(day.entries);
  const looks = ootd ? [ootd, ...day.entries.filter((e) => e !== ootd)] : [];
  const draft = day.date >= today ? day.draft : null;
  const pages = looks.length + (draft ? 1 : 0) + 1;
  const width = fitPageWidth(window.width - PAGE * 2, room, tail);
  const step = width + PAGE;
  // A page narrower than the screen stands centred; each snap lands the next one there too.
  const inset = (window.width - width) / 2;
  return (
    <View
      className="gap-4"
      onLayout={(e) => {
        const next = Math.round(e.nativeEvent.layout.height - width * PHOTO_RATIO);
        if (next !== tail) setTail(next);
      }}
    >
      <ScrollView
        horizontal
        snapToInterval={step}
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        scrollEnabled={pages > 1}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / step))}
        testID="day-slot"
        className="-mx-5"
        contentContainerStyle={{ paddingHorizontal: inset, gap: PAGE }}
      >
        {looks.map((entry, i) => (
          <View
            key={entry.id}
            style={{ width }}
            testID={i === 0 ? 'ootd-page' : `day-page-${entry.id}`}
          >
            <LookTile
              look={entry.look}
              variant="ootd"
              width={width}
              onPress={() => router.push(`/look/${entry.look.id}?day=${day.date}`)}
              label={copy.slot.open(entry.look.name)}
              testID={i === 0 ? 'ootd-card' : `day-card-${entry.id}`}
              onImage={
                <>
                  {justSaved === entry.look.id ? <SavedBadge /> : null}
                  {/* The image stack opens the Edit look drawer on its Add a photo card (design
                      "Add a photo to a look", Annie 11 Nov): × always closes it. */}
                  <ImageStack
                    look={entry.look}
                    onOpen={() =>
                      router.push(`/looks/draft/${entry.look.id}?day=${day.date}&images=add`)
                    }
                  />
                </>
              }
              corner={
                <Remove
                  label={copy.slot.remove(entry.look.name, dayWord)}
                  onPress={() => actions.onRemove(entry)}
                />
              }
            />
            <ActionDiscs>
              <ActionDisc
                icon="book"
                label={copy.discs.swap}
                accessibilityLabel={copy.discs.swapLabel(entry.look.name)}
                onPress={() => actions.onSwap(entry)}
                testID={i === 0 ? 'ootd-swap' : undefined}
              />
              <ActionDisc
                icon="pencil"
                label={copy.discs.edit}
                accessibilityLabel={copy.discs.editLabel(entry.look.name)}
                onPress={() => actions.onEdit(entry)}
                testID={i === 0 ? 'ootd-edit' : undefined}
              />
            </ActionDiscs>
            {/* Felix's caption: her look's name, sentence case, under the discs. */}
            <Text variant="meta" tone="muted" numberOfLines={1} className="mt-3 text-center">
              {entry.look.name}
            </Text>
          </View>
        ))}
        {draft ? <DraftTile draft={draft} day={day} today={today} width={width} /> : null}
        <AddPage
          width={width}
          dayWord={dayWord}
          model={model}
          actions={actions}
          another={looks.length > 0}
        />
      </ScrollView>
      {pages > 1 ? <Pager pages={pages} page={Math.min(page, pages - 1)} /> : null}
    </View>
  );
}

// The way into a look: her model on the day's photograph, the model stack at its top left until
// her twin stands, Capture · Create · Pick on its foot.
function AddPage({
  width,
  dayWord,
  model,
  actions,
  another,
}: {
  width: number;
  dayWord: string;
  model: Model | undefined;
  actions: DayActions;
  another: boolean;
}) {
  const stand = model?.stand;
  const portrait = stand?.imageUrl ?? null;
  return (
    <View
      style={{ width }}
      accessibilityLabel={another ? copy.discs.add : undefined}
      testID="add-page"
    >
      <View className="overflow-hidden rounded-tile bg-surface-sunk">
        {portrait ? (
          // One frame kept across a model change: expo-image's `transition` crossfades the new
          // portrait over the old (PRD rev 3 §2.6). The web twin keys the <img> and fades it in.
          <Image source={portrait} alt="" aspect="4:5" />
        ) : (
          <Skeleton width="100%" aspectRatio={ASPECTS['4:5']} className="rounded-none" />
        )}
        {stand && stand.on !== 'twin' ? (
          <ModelStack portrait={portrait} onPress={actions.onModel} />
        ) : null}
      </View>
      <ActionDiscs>
        <ActionDisc
          icon="capture"
          label={copy.discs.capture}
          accessibilityLabel={copy.discs.captureLabel(dayWord)}
          onPress={actions.onCapture}
          testID="disc-capture"
        />
        {actions.onDescribe ? (
          <ActionDisc
            primary
            label={copy.discs.create}
            accessibilityLabel={copy.discs.createLabel(dayWord)}
            onPress={actions.onDescribe}
            testID="disc-create"
          />
        ) : null}
        <ActionDisc
          icon="book"
          label={copy.discs.pick}
          accessibilityLabel={copy.discs.pickLabel(dayWord)}
          onPress={actions.onPick}
          testID="disc-pick"
        />
      </ActionDiscs>
    </View>
  );
}

// The pager under the day (frame 3k): the current page an ink bar, the rest small cream dots.
// Decorative: each page names itself.
function Pager({ pages, page }: { pages: number; page: number }) {
  return (
    <View
      className="flex-row items-center justify-center gap-1.5"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="day-pager"
    >
      {Array.from({ length: pages }, (_, i) => i).map((i) => (
        <View
          key={i}
          className={`h-1 rounded-pill ${i === page ? 'w-4 bg-ink' : 'w-1 bg-cream400'}`}
        />
      ))}
    </View>
  );
}

function SavedBadge() {
  return (
    <View
      testID="saved-badge"
      className="absolute top-2.5 left-2.5 rounded-pill bg-surface-raised px-2.5 py-1.5"
    >
      <RNText
        maxFontSizeMultiplier={maxFontSizeMultiplier.label}
        className="text-accent-plan"
        style={typeStyle('label')}
      >
        ✓ {lookbook.draft.badgeSaved}
      </RNText>
    </View>
  );
}

// The × on a look: Felix's 28pt veil-mid disc with the × in ink-mute, its hit area 44.
function Remove({ label, onPress }: { label: string; onPress: () => void }) {
  const mute = useColor('ink-mute');
  const size = 28;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={(MIN_TOUCH - size) / 2}
      style={{ width: size, height: size }}
      className="items-center justify-center rounded-pill bg-veil-mid"
    >
      <Icon name="close" size={12} color={mute} />
    </Pressable>
  );
}
