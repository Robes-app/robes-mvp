import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { errors, lookbook, looks as looksCopy } from '@robes/copy';
import { longDate, weekdayDayMonth } from '@robes/core/calendar';
import { wearDiff } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { FINE_EDGE, Skeleton, Subview, Text, useColor, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { nativeAnalytics } from '@/lib/analytics';

const copy = lookbook.savedLook.wornView;
const wears = looksCopy.page.wears;

// Felix's WornView: the dates a look was worn, newest first, each on its own row with the wear's
// note and an × (a wear is a fact: deleted, never edited). "+ Add a date" opens `DiarySheet`, the
// one drawer that logs a date. The row opens its day. Web twin:
// app/src/components/looks/worn-view.tsx.
export function WornView({
  look,
  open,
  onBack,
  onAddDate,
}: {
  look: Look;
  open: boolean;
  onBack: () => void;
  onAddDate: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const ink = useColor('ink');
  const query = useApi('looks.wears', { params: { id: look.id } }, { enabled: open });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.wears') }),
      queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.get') }),
      queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') }),
    ]);
  const remove = useApiMutation('looks.unwear', {
    onSuccess: async () => {
      nativeAnalytics.track('wear_undone');
      toast.show({ message: wears.removed });
      await refresh();
    },
    onError: () => toast.show({ message: errors.internal }),
  });
  const items = query.data?.items ?? [];
  const labelOf = (id: string) => look.pieces.find((p) => p.piece.id === id)?.piece.label ?? null;
  return (
    <Subview
      open={open}
      title={copy.title(look.timesWorn)}
      onBack={onBack}
      testID="worn-view"
      footer={
        <Pressable
          accessibilityRole="button"
          onPress={onAddDate}
          className="min-h-12 items-center justify-center rounded-pill border border-border-control"
        >
          <Text size="small">{copy.add}</Text>
        </Pressable>
      }
    >
      {query.isPending ? (
        <Skeleton shape="text" width="60%" />
      ) : items.length === 0 ? (
        <Text italic tone="muted" className="pt-7 pb-2 text-center" style={{ fontSize: 17 }}>
          {copy.none}
        </Text>
      ) : (
        <View className="gap-2">
          {items.map((wear) => {
            const diff = wearDiff(
              wear.pieces,
              look.pieces.map((p) => ({ id: p.piece.id })),
              labelOf,
            );
            const date = longDate(wear.wornOn);
            return (
              <View
                key={wear.id}
                className="flex-row items-center gap-3 rounded-input border-rule-mid bg-bg pl-3.5"
                style={{ height: 54, paddingRight: 6, borderWidth: FINE_EDGE }}
              >
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={wears.openDay(date)}
                  onPress={() => router.push(`/day/${wear.wornOn}`)}
                  className="min-w-0 flex-1 flex-row items-center gap-3"
                >
                  <Text size="small">{weekdayDayMonth(wear.wornOn)}</Text>
                  <Text
                    italic
                    tone="muted"
                    numberOfLines={1}
                    className="flex-1"
                    style={{ fontSize: 15 }}
                  >
                    {diff.differs ? wears.diff(diff.instead, diff.without) : wears.asSaved}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={wears.remove(date)}
                  onPress={() => remove.mutate({ params: { id: look.id, date: wear.wornOn } })}
                  className="items-center justify-center"
                  style={{ width: 36, height: 44 }}
                >
                  <Icon name="close" size={17} color={ink} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Subview>
  );
}
