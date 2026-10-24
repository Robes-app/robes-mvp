import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { errors, looks as looksCopy } from '@robes/copy';
import { dayMonth, longDate } from '@robes/core/calendar';
import { wearDiff } from '@robes/core/looks';
import { Button, Eyebrow, IconButton, Skeleton, Text, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

const copy = looksCopy.page.wears;
const _PAST_DAYS = 14;

// The look's own record, under the rack and standing alone: a wear is a fact about a day, never
// part of the look's composition. Each row opens its day and says what that day held that the
// look no longer does — the wear keeps its own snapshot, so the record stays true as the look
// moves on. The native twin of the web's WearRecord.
export function WearRecord({ look, onAddDate }: { look: Look; onAddDate: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useApi('looks.wears', { params: { id: look.id } });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.wears') }),
      queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.get') }),
      queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') }),
    ]);
  const remove = useApiMutation('looks.unwear', {
    onSuccess: async () => {
      toast.show({ message: copy.removed });
      await refresh();
    },
    onError: () => toast.show({ message: errors.internal }),
  });

  const items = query.data?.items ?? [];
  const labelOf = (id: string) => look.pieces.find((p) => p.piece.id === id)?.piece.label ?? null;

  return (
    <View className="gap-3 rounded-crisp border border-hairline bg-surface p-4">
      {/* The record's own head: what it is, and how often — the rows beneath are the days. */}
      <View className="flex-row items-baseline justify-between gap-3">
        <Eyebrow>{copy.title}</Eyebrow>
        {look.timesWorn > 0 ? (
          <Text size="caption" tone="faint" italic>
            {copy.count(look.timesWorn)}
          </Text>
        ) : null}
      </View>

      {query.isPending ? (
        <Skeleton shape="text" width="60%" />
      ) : items.length === 0 ? (
        <Text size="small" tone="muted" italic>
          {copy.none}
        </Text>
      ) : (
        <View>
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
                className="mb-1.5 flex-row items-center gap-2 rounded-crisp border border-hairline bg-bg py-2 pr-1 pl-3"
              >
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={copy.openDay(date)}
                  onPress={() => router.push(`/day/${wear.wornOn}`)}
                  className="min-w-0 flex-1 flex-row items-center gap-3"
                >
                  <Text size="small">{dayMonth(wear.wornOn)}</Text>
                  <Text size="caption" tone="faint" italic numberOfLines={1} className="flex-1">
                    {diff.differs ? copy.diff(diff.instead, diff.without) : copy.asSaved}
                  </Text>
                </Pressable>
                <IconButton
                  icon="close"
                  label={copy.remove(date)}
                  onPress={() => remove.mutate({ params: { id: look.id, date: wear.wornOn } })}
                />
              </View>
            );
          })}
        </View>
      )}

      <Button variant="quiet" onPress={onAddDate}>
        {copy.addDate}
      </Button>
    </View>
  );
}
