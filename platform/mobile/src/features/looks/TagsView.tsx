import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { errors } from '@robes/copy';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { TagsSheet } from '@/features/tags/TagsSheet';

// The saved look's details (PR 6): one mutation for its tags, seasons and caption.
export function useLookDetails(look: Look) {
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
    onError: () => {
      toast.show({ message: errors.internal });
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

// Details › Tags: the look's tags in the one Tags drawer a piece shares (TagsSheet); each tick is
// written at once. Web twin: app/src/components/looks/tags-view.tsx.
export function TagsView({
  look,
  open,
  onBack,
}: {
  look: Look;
  open: boolean;
  onBack: () => void;
}) {
  const update = useLookDetails(look);
  return (
    <TagsSheet
      open={open}
      selected={look.tags}
      onChange={(tags) => update.mutate({ params: { id: look.id }, input: { tags } })}
      onClose={onBack}
      testID="tags-view"
    />
  );
}
