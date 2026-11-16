import { queryKeys, useApiMutation } from '@robes/api-client/react';
import { useQueryClient } from '@tanstack/react-query';

// Try again on a piece Robes couldn't read (audit F3): it goes back to reading and the page and
// the wardrobe refresh until it fills in. Web twin: app/src/lib/reread.ts.
export function useReread() {
  const queryClient = useQueryClient();
  return useApiMutation('wardrobe.reread', {
    onSuccess: async (saved) => {
      queryClient.setQueryData(queryKeys.call('wardrobe.get', { params: { id: saved.id } }), saved);
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
    },
  });
}
