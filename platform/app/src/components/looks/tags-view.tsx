'use client';

import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { tags as copy } from '@robes/copy';
import { Subview, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useTagsPicker } from '@/components/tags/tags-picker';
import { errorCopy } from '@/lib/error-copy';

// The saved look's tags (PR 6): her own tags, for both looks and pieces.
export function useLookTags(look: Look) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  return useApiMutation('looks.update', {
    onSuccess: (updated) => {
      queryClient.setQueryData(key, updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('tags.list') });
    },
    onError: (err) => {
      toast({ message: errorCopy(err) });
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

// Details › Tags: the look's tags in the one Tags picker a piece shares (useTagsPicker); each
// tick is written at once. Native twin: mobile/src/features/looks/TagsView.tsx.
export function TagsView({
  look,
  open,
  onBack,
}: {
  look: Look;
  open: boolean;
  onBack: () => void;
}) {
  const update = useLookTags(look);
  const picker = useTagsPicker(look.tags, (tags) =>
    update.mutate({ params: { id: look.id }, input: { tags } }),
  );
  return (
    <Subview
      open={open}
      title={copy.title}
      onBack={onBack}
      testId="tags-view"
      footer={picker.addField}
    >
      {picker.list}
    </Subview>
  );
}
