import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { you } from '@robes/copy';
import { Button, Text, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { errorMessage } from '@/lib/errors';

const copy = you.model;

// Her look on her model, once she has one; the render becomes the look's image.
export function SeeOnMe({ look }: { look: Look }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const model = useApi('me.model.get');
  const render = useApiMutation('looks.renderOnModel', {
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: queryKeys.call('looks.get', { params: { id: look.id } }),
      }),
    onError: (err) => toast.show({ message: errorMessage(err) }),
  });
  if (!model.data || look.pieces.length === 0) return null;
  if (!model.data.filed || model.data.cell.status !== 'ready') {
    return (
      <Button variant="quiet" className="self-center" onPress={() => router.push('/you/model')}>
        {copy.build}
      </Button>
    );
  }
  if (look.onModel === 'pending') return <Text tone="muted">{copy.dressing}</Text>;
  return (
    <>
      <Button
        variant="secondary"
        loading={render.isPending}
        onPress={() => render.mutate({ params: { id: look.id } })}
      >
        {copy.seeOnMe}
      </Button>
      {look.onModel === 'failed' ? <Text tone="muted">{copy.onMeFailed}</Text> : null}
    </>
  );
}
