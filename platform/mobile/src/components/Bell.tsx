import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { NotificationItem, Notifications } from '@robes/contracts';
import { bell as copy } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { fonts, MIN_TOUCH, maxFontSizeMultiplier, Sheet, Text, useColor } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';

// The bell (design 3k, plan §1.12): Felix's 36pt bell beside the avatar, the 17pt glyph at 1.2,
// a 7pt rose dot while anything waits (D6), and the count in its label; its 44pt hit area reaches
// past the box. Its sheet lists each item as a card with where it leads and a × that dismisses it.
// The web twin is app/src/components/shell/bell.tsx.
const BELL = 36;

export function Bell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');
  const [open, setOpen] = useState(false);
  const { data } = useApi('notifications.list', undefined, { staleTime: 60_000 });
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('notifications.list') });
  const dismiss = useApiMutation('notifications.dismiss', { onSuccess: refresh, onError: refresh });
  const items = data?.items ?? [];
  // The card leaves at once; the server read follows.
  const dismissItem = (key: string) => {
    queryClient.setQueryData(queryKeys.call('notifications.list'), (old: unknown) => {
      const n = old as Notifications | undefined;
      return n ? { items: n.items.filter((i) => i.key !== key) } : old;
    });
    dismiss.mutate({ input: { key } });
  };
  // Where each line leads: receipts to the Wardrobe inbox, a diary nudge to that day on home.
  const go = (item: NotificationItem) => {
    setOpen(false);
    if (item.kind === 'receipts') router.push('/wardrobe/inbox');
    else if (item.kind === 'overnight') router.push(`/today/look/${item.lookId ?? ''}`);
    else router.push({ pathname: '/', params: { day: item.date ?? '' } });
  };
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
      <Sheet open={open} onClose={() => setOpen(false)} title={copy.title} closeButton>
        {items.length === 0 ? (
          <Text size="caption" tone="muted" testID="bell-empty">
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
                  <View className="size-8 items-center justify-center rounded-input bg-surface-sunk">
                    <Icon
                      name={
                        item.kind === 'receipts'
                          ? 'receipt'
                          : item.kind === 'overnight'
                            ? 'looks'
                            : 'plan'
                      }
                      size={14}
                      color={muted}
                    />
                  </View>
                  <View className="flex-1">
                    <RNText
                      maxFontSizeMultiplier={maxFontSizeMultiplier.body}
                      className="text-ink"
                      style={{ fontFamily: fonts.display, fontSize: 16, lineHeight: 19 }}
                    >
                      {item.text}
                    </RNText>
                    <RNText
                      maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                      className="mt-1 text-ink-faint uppercase"
                      style={{ fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.4 }}
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
                  style={{ width: 36, height: 36 }}
                  className="items-center justify-center rounded-pill border border-rule-mid bg-bg"
                >
                  <Icon name="close" size={14} color={faint} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </Sheet>
    </>
  );
}
