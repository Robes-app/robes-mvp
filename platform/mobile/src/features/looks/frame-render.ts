import { queryKeys, useApiMutation } from '@robes/api-client/react';
import { useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '@/lib/errors';

// "Show this look" / "Show it": starts one on-demand frame render (UX-09). The frame turns
// pending on the server, so the screen's own polling follows it until it lands.
export function useRenderIdeaFrame(ideaId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const render = useApiMutation('looks.ideas.render', {
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.call('looks.ideas.get', { params: { id: ideaId } }),
      }),
    onError: (err) => toast.show({ message: errorMessage(err) }),
  });
  return {
    start: (idx: number) => render.mutate({ params: { id: ideaId, idx } }),
    renderingIdx: render.isPending ? Number(render.variables?.params.idx) : null,
  };
}

export function useRenderDailyItem(dailyLookId: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const render = useApiMutation('today.looks.render', {
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.call('today.looks.get', { params: { id: dailyLookId } }),
      }),
    onError: (err) => toast.show({ message: errorMessage(err) }),
  });
  return {
    start: (idx: number) => render.mutate({ params: { id: dailyLookId, idx } }),
    renderingIdx: render.isPending ? Number(render.variables?.params.idx) : null,
  };
}
