'use client';

import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook, looks as looksCopy, ui } from '@robes/copy';
import { lookWearFor } from '@robes/core/looks';
import { Pill, Sheet, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { errorCopy } from '@/lib/error-copy';

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
// The native twin is mobile/src/features/looks/TagsSheet.tsx.
export function TagsSheet({
  look,
  open,
  onOpenChange,
}: {
  look: Look;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  const update = useApiMutation('looks.update', {
    onSuccess: (updated) => {
      queryClient.setQueryData(key, updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    },
    onError: (err) => {
      toast({ message: errorCopy(err) });
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={copy.tags} closeLabel={ui.done}>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 font-sans text-ink-muted text-sm">{copy.season}</legend>
        <div className="flex flex-wrap gap-2">
          {BANDS.map((b) => (
            <Pill
              key={b}
              selected={look.climateBand === b}
              onClick={() => update.mutate({ params: { id: look.id }, input: { climateBand: b } })}
            >
              {seasons[b]}
            </Pill>
          ))}
        </div>
      </fieldset>
    </Sheet>
  );
}
