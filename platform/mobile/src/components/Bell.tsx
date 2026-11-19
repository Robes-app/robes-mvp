import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { BellCard, BellCardKind, Notifications } from '@robes/contracts';
import { bell as copy } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier, useColor } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { nativeAnalytics } from '@/lib/analytics';
import { DetentSheet } from './DetentSheet';
import { SwipeRow } from './SwipeRow';

const BELL = 36;

// Each kind's glyph (Felix NotificationsSheet; design "Onboarding notifications", 19 Nov).
const ICON = {
  twin: 'user',
  dna: 'dna',
  observations: 'eye',
  receipts: 'receipt',
  diary: 'calendar',
  overnight: 'looks',
} as const satisfies Record<BellCardKind, string>;

// What waits behind the bell, shared with Settings' Notifications row ("2 new").
export function useNotifications() {
  return useApi('notifications.list', undefined, { staleTime: 60_000 });
}

// The cards she has not seen yet: they light the dot and make the count (design 19 Nov).
export const unseenCount = (data: Notifications | undefined): number =>
  data?.cards.filter((c) => !c.seen).length ?? 0;

// The bell (design 3k, plan §1.12; PRD rev 3 §2.2): Felix's 36pt bell beside the avatar, the 17pt
// glyph at 1.2, a 7pt rose dot and the count in its label; its 44pt hit area reaches past the box.
// It stands only while something waits — with nothing there is no bell (the Settings row still
// lists Notifications). The dot and the count are the cards she hasn't seen; opening the sheet
// sees them all (design 19 Nov). The web twin is app/src/components/shell/bell.tsx.
export function Bell() {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data } = useNotifications();
  const cards = data?.cards ?? [];
  const unseen = unseenCount(data);
  const seen = useApiMutation('notifications.seen');
  if (cards.length === 0 && !open) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.openNew(unseen)}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setOpen(true);
          nativeAnalytics.track('bell_opened', { unseen });
          if (unseen > 0) {
            queryClient.setQueryData(queryKeys.call('notifications.list'), (old: unknown) => {
              const n = old as Notifications | undefined;
              return n ? { ...n, cards: n.cards.map((c) => ({ ...c, seen: true })) } : old;
            });
            seen.mutate({ input: {} });
          }
        }}
        testID="bell"
        hitSlop={(MIN_TOUCH - BELL) / 2}
        style={{ width: BELL, height: BELL }}
        className="items-center justify-center rounded-pill"
      >
        {({ pressed }) => (
          <>
            <Icon name="bell" size={17} stroke={1.2} color={pressed ? muted : ink} />
            {unseen ? (
              // Felix's 7pt rose dot (a 1.5 ring of the page), at the glyph's shoulder.
              <View
                testID="bell-dot"
                importantForAccessibility="no-hide-descendants"
                style={{ width: 7, height: 7, borderWidth: 1.5, top: 8, right: 9 }}
                className="absolute rounded-pill border-bg bg-accent-inspire"
              />
            ) : null}
          </>
        )}
      </Pressable>
      <NotificationsSheet open={open} onClose={() => setOpen(false)} cards={cards} />
    </>
  );
}

// Felix's NotificationsSheet: the drawer header (× · Notifications), then each card — its glyph on
// a `cream-200` tile, the task in Cormorant 16, where it leads as a tracked line, a › — that swipes
// left to dismiss, one at a time, as a Wardrobe row does (audit, native polish); screen readers
// get Dismiss as the card's action. The web keeps its × (no swipe there). No Clear all (design
// "Onboarding notifications", 19 Nov, over PRD rev 3 §10 12): × and the scrim close without
// touching them. A dismissed receipts line leaves the receipts themselves waiting in the Wardrobe;
// the Twin and Style DNA cards come back once, a week later. Web twin:
// app/src/components/shell/bell.tsx.
function NotificationsSheet({
  open,
  onClose,
  cards,
}: {
  open: boolean;
  onClose: () => void;
  cards: readonly BellCard[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const muted = useColor('ink-muted');
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('notifications.list') });
  const dismiss = useApiMutation('notifications.dismiss', { onSuccess: refresh, onError: refresh });
  // The card leaves at once; the server read follows.
  const dismissItem = (card: BellCard) => {
    queryClient.setQueryData(queryKeys.call('notifications.list'), (old: unknown) => {
      const n = old as Notifications | undefined;
      return n
        ? {
            items: n.items.filter((i) => i.key !== card.key),
            cards: n.cards.filter((c) => c.key !== card.key),
          }
        : old;
    });
    nativeAnalytics.track('bell_card_dismissed', { kind: card.kind });
    dismiss.mutate({ input: { key: card.key } });
  };
  // Where each card leads: the twin to You › Model, Style DNA to its first missing answer,
  // Observations to theirs, receipts to the Wardrobe inbox, a diary nudge to that day on home,
  // the overnight look to its page.
  const go = (card: BellCard) => {
    onClose();
    nativeAnalytics.track('bell_card_tapped', { kind: card.kind });
    if (card.kind === 'twin') router.push('/you/model');
    else if (card.kind === 'dna') {
      router.push({ pathname: '/you/style', params: card.section ? { open: card.section } : {} });
    } else if (card.kind === 'observations') router.push('/you/observations');
    else if (card.kind === 'receipts') router.push('/wardrobe/inbox');
    else if (card.kind === 'overnight') router.push(`/today/look/${card.lookId ?? ''}`);
    else router.push({ pathname: '/', params: { day: card.date ?? '' } });
  };
  return (
    <DetentSheet open={open} onClose={onClose} title={copy.title} scroll testID="bell-sheet">
      {cards.length === 0 ? (
        <RNText
          maxFontSizeMultiplier={maxFontSizeMultiplier.body}
          className="py-14 text-center text-ink"
          style={{ fontFamily: fonts.displayItalic, fontSize: 24, lineHeight: 28 }}
          testID="bell-empty"
        >
          {copy.empty}
        </RNText>
      ) : (
        <View className="gap-2.5" testID="bell-items">
          {cards.map((item) => (
            <SwipeRow
              key={item.key}
              text={copy.dismiss}
              label={`${copy.dismiss}: ${item.text}`}
              onAct={() => dismissItem(item)}
              className="rounded-soft"
              testID={`bell-item-${item.key}`}
            >
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${item.text} · ${copy.dest[item.kind]}`}
                onPress={() => go(item)}
                className="min-h-14 flex-1 flex-row items-center gap-3 rounded-soft border border-hairline bg-surface-raised py-3 pr-3.5 pl-3"
              >
                <View
                  testID={`bell-icon-${ICON[item.kind]}`}
                  className="size-8 items-center justify-center rounded-input bg-surface-sunk"
                >
                  <Icon name={ICON[item.kind]} size={14} stroke={1.3} color={muted} />
                </View>
                <View className="flex-1">
                  <RNText
                    maxFontSizeMultiplier={maxFontSizeMultiplier.body}
                    className="text-ink"
                    style={{ fontFamily: fonts.display, fontSize: 16, lineHeight: 20 }}
                  >
                    {item.text}
                  </RNText>
                  <RNText
                    maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                    className="text-ink-faint uppercase"
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 9,
                      letterSpacing: 1.44,
                      marginTop: 5,
                    }}
                  >
                    {copy.dest[item.kind]}
                  </RNText>
                </View>
                <Icon name="forward" size={14} color={muted} />
              </Pressable>
            </SwipeRow>
          ))}
        </View>
      )}
    </DetentSheet>
  );
}
