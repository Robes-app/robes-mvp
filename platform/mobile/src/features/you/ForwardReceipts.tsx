import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { you } from '@robes/copy';
import { Button, Eyebrow, Heading, Text, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { errorMessage } from '@/lib/errors';

const copy = you.receipts;

// Her forwarding address (legacy _showMailStep): the eyebrow, the heading, and the address card
// as THE one action — a tap copies it. Replacing it and turning it off are quiet beneath.
export function ForwardReceipts() {
  const router = useRouter();
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
  const held = useApi('inbox.list', undefined, { enabled: !off });
  const value = off ? null : (address.data?.address ?? null);
  const waiting = off ? 0 : (held.data?.count ?? 0);

  return (
    <ScrollView contentContainerClassName="gap-4 px-6 pb-12">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <Heading>{copy.heading}</Heading>
      {value ? (
        <View className="gap-4">
          {/* The card is the action: a tap opens the share sheet, where Copy lives on a phone. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.share}
            onPress={() => void Share.share({ message: value })}
            testID="inbox-address"
            className="min-h-11 gap-1 rounded-soft border border-hairline bg-surface px-4 py-3"
          >
            <Text size="caption" tone="muted">
              {copy.addressLabel}
            </Text>
            <Text selectable>{value}</Text>
            <Text size="small" tone="muted">
              {copy.share}
            </Text>
          </Pressable>
          <View className="gap-2">
            {copy.steps.map((step, i) => (
              <View key={step} className="flex-row gap-3">
                <Text tone="muted" size="small">
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text tone="muted" size="small" className="flex-1">
                  {step}
                </Text>
              </View>
            ))}
          </View>
          {waiting > 0 ? (
            <Button
              variant="quiet"
              className="self-start"
              onPress={() => router.push('/wardrobe?segment=inbox')}
            >
              {`${copy.waiting(waiting)} · ${copy.review}`}
            </Button>
          ) : null}
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
