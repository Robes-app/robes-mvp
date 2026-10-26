import { useApi, useApiMutation } from '@robes/api-client/react';
import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import {
  Button,
  Em,
  ErrorText,
  Eyebrow,
  Heading,
  MIN_TOUCH,
  PrimaryScope,
  SegmentedControl,
  Text,
  useColor,
} from '@robes/ui-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { errorMessage } from '@/lib/errors';
import { isTerminal } from '../looks/ideas';
import { type AddDestination, destinationOf, reviewHref } from './add/flow';
import { JOB_POLL_MS } from './inbox';

const copy = wardrobe.add.link;

// Paste a link (design "Add Piece — Handoff"): the URL field with Paste inside it (the link is
// almost always on the clipboard) and a clear ×, where the piece goes, and "Read the page"
// docked above the keyboard. The isolated fetcher reads the page (SEC-40), then Review opens on
// the piece. Web twin: components/wardrobe/link-import.tsx.
export function LinkImport() {
  const router = useRouter();
  const params = useLocalSearchParams<{ to?: string }>();
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  const [url, setUrl] = useState('');
  const [to, setTo] = useState<AddDestination>(() => destinationOf(params.to));
  const start = useApiMutation('imports.link');
  const jobId = start.data?.jobId ?? '';
  const job = useApi(
    'jobs.get',
    { params: { id: jobId } },
    {
      enabled: jobId !== '',
      refetchInterval: (q) => (isTerminal(q.state.data) ? false : JOB_POLL_MS),
    },
  );
  const inboxId = job.data?.status === 'succeeded' ? job.data.output.inboxId : undefined;
  const failed = job.data && isTerminal(job.data) && !inboxId;
  const reading = start.isPending || (jobId !== '' && !isTerminal(job.data));

  useEffect(() => {
    if (inboxId) router.replace(reviewHref({ to, link: inboxId }));
  }, [inboxId, router, to]);

  async function paste() {
    const text = (await Clipboard.getStringAsync().catch(() => '')).trim();
    if (text) setUrl(text);
  }

  const empty = url.trim() === '';
  return (
    <PrimaryScope>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="gap-5 px-6 pb-6" keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <Heading size="md" style={{ fontSize: 32 }}>
              {copy.title} <Em>{copy.wink}</Em>
            </Heading>
          </View>
          <View className="gap-2">
            <Eyebrow>{copy.label}</Eyebrow>
            <View
              className={`min-h-11 flex-row items-center rounded-crisp border bg-surface-raised pl-4 ${empty ? 'border-border-control' : 'border-ink-muted'}`}
            >
              <TextInput
                accessibilityLabel={copy.label}
                value={url}
                onChangeText={setUrl}
                placeholder={copy.placeholder}
                placeholderTextColorClassName="accent-ink-faint"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                maxLength={2048}
                className="flex-1 py-3 text-base text-ink"
              />
              {empty ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.paste}
                  onPress={() => void paste()}
                  style={{ minHeight: MIN_TOUCH }}
                  className="justify-center px-3"
                >
                  <View className="rounded-pill border border-hairline bg-surface px-3 py-1">
                    <Text size="caption" style={{ color: ink }}>
                      {copy.paste}
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.clear}
                  onPress={() => setUrl('')}
                  style={{ width: MIN_TOUCH, height: MIN_TOUCH }}
                  className="items-center justify-center"
                >
                  <Icon name="close" size={16} color={faint} />
                </Pressable>
              )}
            </View>
          </View>
          <View className="gap-2">
            <SegmentedControl<AddDestination>
              label={wardrobe.add.destination}
              value={to}
              onChange={setTo}
              options={[
                { value: 'wardrobe', label: wardrobe.add.to.wardrobe },
                { value: 'wishlist', label: wardrobe.add.to.wishlist },
              ]}
            />
            <Text size="small" tone="muted">
              {copy.help[to]}
            </Text>
          </View>
          {start.isError ? (
            <ErrorText>{errorMessage(start.error)}</ErrorText>
          ) : failed ? (
            <ErrorText>{copy.failed}</ErrorText>
          ) : null}
        </ScrollView>
        <View className="px-6 pb-4">
          <Button
            disabled={empty || reading}
            loading={reading}
            loadingLabel={copy.reading}
            onPress={() => start.mutate({ input: { url: url.trim(), as: to } })}
          >
            {copy.read}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </PrimaryScope>
  );
}
