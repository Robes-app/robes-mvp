import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { you } from '@robes/copy';
import { Button, Eyebrow, Heading, Text, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';

const copy = you.receipts;

// Her forwarding address (legacy _showMailStep): the eyebrow, the heading, and the address card
// as THE one action — a tap copies it. Replacing it and turning it off are quiet beneath, except
// as the add flow's door (`door`), which is the card and the three steps alone (design "Add
// Piece — Handoff"). Web twin: app/(app)/you/forward-receipts.tsx.
export function ForwardReceipts({ door = false }: { door?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [off, setOff] = useState(false);
  const [copied, setCopied] = useState(false);
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

  async function copyAddress(text: string) {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.show({ message: copy.copyFailed(text) });
    }
  }
  const waiting = off ? 0 : (held.data?.count ?? 0);

  return (
    <ScrollView contentContainerClassName="gap-4 px-6 pb-12">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <Heading>{copy.heading}</Heading>
      {value ? (
        <View className="gap-4">
          {/* The card is the action: one tap copies, and it says so for two seconds. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copied ? copy.copied : copy.copy}
            onPress={() => void copyAddress(value)}
            testID="inbox-address"
            className={`min-h-11 gap-1 rounded-soft border px-4 py-3 ${copied ? 'border-selected-line bg-selected' : 'border-hairline bg-surface'}`}
          >
            <Text size="caption" tone="muted">
              {copy.addressLabel}
            </Text>
            <Text selectable>{value}</Text>
            <Text size="small" tone="muted">
              {copied ? copy.copied : copy.copy}
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
              onPress={() => router.push('/wardrobe/inbox')}
            >
              {`${copy.waiting(waiting)} · ${copy.review}`}
            </Button>
          ) : null}
          {door ? null : (
            <>
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
            </>
          )}
        </View>
      ) : off ? (
        <Button variant="secondary" onPress={() => setOff(false)}>
          {copy.turnOn}
        </Button>
      ) : null}
    </ScrollView>
  );
}
