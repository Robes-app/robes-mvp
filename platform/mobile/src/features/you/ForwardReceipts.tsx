import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { you } from '@robes/copy';
import { Button, Text, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { errorMessage } from '@/lib/errors';

const copy = you.receipts;

// Her forwarding address for receipts: share (Copy lives in the share sheet), replace, or turn off.
export function ForwardReceipts() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [off, setOff] = useState(false);
  const address = useApi('me.inboxAddress.get', undefined, { enabled: !off });
  const key = queryKeys.call('me.inboxAddress.get');
  const regenerate = useApiMutation('me.inboxAddress.regenerate', {
    onSuccess: (data) => {
      queryClient.setQueryData(key, data);
      toast.show({ message: copy.regenerated });
    },
    onError: (err) => toast.show({ message: errorMessage(err) }),
  });
  const revoke = useApiMutation('me.inboxAddress.revoke', {
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: key });
      setOff(true);
      toast.show({ message: copy.turnedOff });
    },
    onError: (err) => toast.show({ message: errorMessage(err) }),
  });
  const value = off ? null : (address.data?.address ?? null);

  return (
    <ScrollView contentContainerClassName="gap-4 px-6 pb-12">
      <Text tone="muted">{copy.body}</Text>
      {value ? (
        <View className="gap-3">
          <Text selectable testID="inbox-address">
            {value}
          </Text>
          <Button variant="secondary" onPress={() => void Share.share({ message: value })}>
            {copy.share}
          </Button>
          <Button
            variant="quiet"
            loading={regenerate.isPending}
            onPress={() => regenerate.mutate({})}
          >
            {copy.regenerate}
          </Button>
          <Button variant="quiet" loading={revoke.isPending} onPress={() => revoke.mutate({})}>
            {copy.turnOff}
          </Button>
        </View>
      ) : off ? (
        <Button variant="secondary" onPress={() => setOff(false)}>
          {copy.turnOn}
        </Button>
      ) : null}
    </ScrollView>
  );
}
