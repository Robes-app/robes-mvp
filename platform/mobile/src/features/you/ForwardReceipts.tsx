import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { you } from '@robes/copy';
import { splitAddress } from '@robes/core/inbox';
import { Button, Eyebrow, fonts, Heading, MIN_TOUCH, Text, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';

const copy = you.receipts;

// Her forwarding address (legacy _showMailStep): the eyebrow, the heading (serif 28/300, the
// subpage size), and the address card — a rose eyebrow, the address broken only at the @, and one
// hairline "Copy address" pill that reads "Copied" for two seconds (Add Piece redline 05).
// Replacing it and turning it off are quiet beneath, except as the add flow's door (`door`), which
// is the card and the three steps alone. Web twin: app/(app)/you/forward-receipts.tsx.
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
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.show({ message: copy.copyFailed(text) });
    }
  }
  const waiting = off ? 0 : (held.data?.count ?? 0);

  return (
    <ScrollView contentContainerClassName="gap-4 px-6 pb-12">
      <Eyebrow>{copy.eyebrow}</Eyebrow>
      <Heading style={{ fontSize: 28 }}>{copy.heading}</Heading>
      {value ? (
        <View className="gap-4">
          <View className="gap-3 rounded-soft border border-hairline bg-surface-raised px-4 py-4">
            <Text
              className="text-[9px] uppercase text-accent-warm"
              style={{ fontFamily: fonts.sansMedium, letterSpacing: 2.16 }}
            >
              {copy.addressLabel}
            </Text>
            <AddressLines address={value} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copied ? copy.copied : copy.copy}
              onPress={() => void copyAddress(value)}
              testID="inbox-address-copy"
              hitSlop={(MIN_TOUCH - 36) / 2}
              className="h-9 flex-row items-center self-start rounded-pill border border-rule-mid bg-surface-raised px-4"
            >
              <Text size="caption">{copied ? copy.copied : copy.copy}</Text>
            </Pressable>
          </View>
          <View className="gap-2">
            {copy.steps.map((step, i) => (
              <View key={step} className="flex-row items-baseline gap-3">
                <Text
                  tone="faint"
                  className="text-[9px]"
                  style={{ fontFamily: fonts.sans, letterSpacing: 1.8 }}
                >
                  {String(i + 1).padStart(2, '0')}
                </Text>
                <Text tone="muted" size="small" className="flex-1">
                  {step}
                </Text>
              </View>
            ))}
          </View>
          {waiting > 0 ? (
            <View className="flex-row flex-wrap items-center">
              <Text size="small" tone="muted">
                {`${copy.waiting(waiting)} · `}
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/wardrobe/inbox')}
                style={{ minHeight: MIN_TOUCH }}
                className="justify-center"
              >
                <Text size="small" tone="muted" className="underline">
                  {copy.review(waiting)}
                </Text>
              </Pressable>
            </View>
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

// Line one is the local part, line two "@in.…": the address only ever breaks at the @ (Inter
// 15/400, never monospace).
function AddressLines({ address }: { address: string }) {
  const { local, domain } = splitAddress(address);
  return (
    <Text
      selectable
      testID="inbox-address"
      accessibilityLabel={address}
      className="text-[15px]"
      style={{ fontFamily: fonts.sansRegular }}
    >
      {domain ? `${local}\n${domain}` : local}
    </Text>
  );
}
