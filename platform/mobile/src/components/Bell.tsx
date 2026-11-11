import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { NotificationItem, NotificationKind, Notifications } from '@robes/contracts';
import { bell as copy } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import {
  FINE_EDGE,
  fonts,
  MIN_TOUCH,
  maxFontSizeMultiplier,
  Sheet,
  Text,
  useColor,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';

const BELL = 36;

// Each kind's glyph (Felix NotificationsSheet): a receipt, the diary's calendar, and the overnight
// look's `looks`.
const ICON = {
  receipts: 'receipt',
  diary: 'calendar',
  overnight: 'looks',
} as const satisfies Record<NotificationKind, string>;

// What waits behind the bell, shared with Settings' Notifications row ("2 new").
export function useNotifications() {
  return useApi('notifications.list', undefined, { staleTime: 60_000 });
}

// The bell (design 3k, plan §1.12; PRD rev 3 §2.2): Felix's 36pt bell beside the avatar, the 17pt
// glyph at 1.2, a 7pt rose dot and the count in its label; its 44pt hit area reaches past the box.
// It stands only while something waits — with nothing new there is no bell (the Settings row
// still lists Notifications). The web twin is app/src/components/shell/bell.tsx.
export function Bell() {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const items = data?.items ?? [];
  if (items.length === 0 && !open) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.openNew(items.length)}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          setOpen(true);
        }}
        testID="bell"
        hitSlop={(MIN_TOUCH - BELL) / 2}
        style={{ width: BELL, height: BELL }}
        className="items-center justify-center rounded-pill"
      >
        {({ pressed }) => (
          <>
            <Icon name="bell" size={17} stroke={1.2} color={pressed ? muted : ink} />
            {items.length ? (
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
      <NotificationsSheet open={open} onClose={() => setOpen(false)} items={items} />
    </>
  );
}

// Felix's NotificationsSheet: the drawer header (× · Notifications · ✓), then each item as a card
// — its glyph on a `cream-200` tile, the task in Cormorant 16, where it leads as a tracked line,
// a › — with a × beside it that dismisses it. The ✓ clears them all (PRD rev 3 §10 12, over
// "Done only closes" of 6 Nov); × and the scrim close without touching them. A dismissed receipts
// line leaves the receipts themselves waiting in the Wardrobe. Web twin:
// app/src/components/shell/bell.tsx.
function NotificationsSheet({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: readonly NotificationItem[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('notifications.list') });
  const dismiss = useApiMutation('notifications.dismiss', { onSuccess: refresh, onError: refresh });
  // The card leaves at once; the server read follows.
  const dismissItem = (key: string) => {
    queryClient.setQueryData(queryKeys.call('notifications.list'), (old: unknown) => {
      const n = old as Notifications | undefined;
      return n ? { items: n.items.filter((i) => i.key !== key) } : old;
    });
    dismiss.mutate({ input: { key } });
  };
  // The ✓: every card goes and the sheet closes behind them.
  const dismissAll = () => {
    if (items.length > 0) {
      queryClient.setQueryData(queryKeys.call('notifications.list'), { items: [] });
      dismiss.mutate({ input: { all: true } });
    }
    onClose();
  };
  // Where each line leads: receipts to the Wardrobe inbox, a diary nudge to that day on home, the
  // overnight look to its page.
  const go = (item: NotificationItem) => {
    onClose();
    if (item.kind === 'receipts') router.push('/wardrobe/inbox');
    else if (item.kind === 'overnight') router.push(`/today/look/${item.lookId ?? ''}`);
    else router.push({ pathname: '/', params: { day: item.date ?? '' } });
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={copy.title}
      done={{ label: copy.clear, onPress: dismissAll, disabled: items.length === 0 }}
      testID="bell-sheet"
    >
      {items.length === 0 ? (
        <Text size="caption" tone="muted" className="-mt-1" testID="bell-empty">
          {copy.empty}
        </Text>
      ) : (
        <View className="gap-2.5" testID="bell-items">
          {items.map((item) => (
            <View key={item.key} className="flex-row items-center gap-2">
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${copy.dismiss}: ${item.text}`}
                onPress={() => dismissItem(item.key)}
                hitSlop={(MIN_TOUCH - 36) / 2}
                style={{ width: 36, height: 36, borderWidth: FINE_EDGE }}
                className="items-center justify-center rounded-pill border-rule-mid bg-bg"
              >
                <Icon name="close" size={14} color={faint} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}
