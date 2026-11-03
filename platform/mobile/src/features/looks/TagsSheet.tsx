import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { errors, lookbook, looks as looksCopy, ui } from '@robes/copy';
import { lookWearFor } from '@robes/core/looks';
import { Pill, Sheet, Text, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';

const copy = looksCopy.page;
const seasons = lookbook.refine.seasons;
const BANDS = ['spring_summer', 'autumn_winter', 'year_round'] as const;

// What the look is tagged with: the season band, and what its pieces are worn for.
export function lookTags(look: Look): string[] {
  return [
    ...(look.climateBand === 'year_round' ? [] : [seasons[look.climateBand]]),
    ...lookWearFor(look),
  ];
}

// The tags sheet (the saved look's Edit tags, the draft's + Tags): the season band, one tap.
// Web twin: components/looks/tags-sheet.tsx.
export function TagsSheet({
  look,
  open,
  onClose,
}: {
  look: Look;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  const update = useApiMutation('looks.update', {
    onSuccess: (updated) => {
      queryClient.setQueryData(key, updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    },
    onError: () => {
      toast.show({ message: errors.internal });
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <Sheet open={open} onClose={onClose} title={copy.tags} closeLabel={ui.done}>
      <View className="gap-2 pb-4">
        <Text size="small" tone="muted">
          {copy.season}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {BANDS.map((b) => (
            <Pill
              key={b}
              selected={look.climateBand === b}
              onPress={() => update.mutate({ params: { id: look.id }, input: { climateBand: b } })}
            >
              {seasons[b]}
            </Pill>
          ))}
        </View>
      </View>
    </Sheet>
  );
}
