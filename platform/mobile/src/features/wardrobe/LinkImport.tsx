import { useApi, useApiMutation } from '@robes/api-client/react';
import { wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import {
  Button,
  Em,
  ErrorText,
  Heading,
  MIN_TOUCH,
  PrimaryScope,
  Text,
  useColor,
} from '@robes/ui-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';
import { PinnedAction } from '@/components/PinnedAction';
import { errorMessage } from '@/lib/errors';
import { isTerminal } from '../looks/ideas';
import { destinationOf, reviewHref } from './add/flow';
import { JOB_POLL_MS } from './inbox';

const copy = wardrobe.add.link;

// Paste a link (design "Add Piece — Handoff", redline 04): the URL field with Paste inside it
// (the link is almost always on the clipboard) and a clear ×, one line on where the piece goes
// (chosen on the Add pieces sheet), and "Read the page" docked above the keyboard. The isolated
// fetcher reads the page (SEC-40), then Review opens on the piece — nothing files before it; a
// page that can't be read keeps her here. Web twin: components/wardrobe/link-import.tsx.
export function LinkImport() {
  const router = useRouter();
  const params = useLocalSearchParams<{ to?: string }>();
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  const [url, setUrl] = useState('');
  const to = destinationOf(params.to);
  const field = useRef<TextInputInstance>(null);
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
          <Heading size="md" style={{ fontSize: 28 }}>
            {copy.title} <Em>{copy.wink}</Em>
          </Heading>
          <View className="gap-2">
            <Text size="caption" tone="faint" className="uppercase tracking-[2px]">
              {copy.label}
            </Text>
            <View className="min-h-12 flex-row items-center rounded-crisp border border-hairline bg-surface-raised pl-4">
              <TextInput
                ref={field}
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
                  className="justify-center pr-3 pl-2"
                >
                  <View className="rounded-pill border border-hairline bg-surface-raised px-3 py-1">
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
          <Text size="small" tone="muted">
            {copy.filingTo[to]} ·{' '}
            <Text
              size="small"
              accessibilityRole="link"
              className="underline"
              onPress={() => router.replace({ pathname: '/wardrobe/add', params: { to } })}
            >
              {copy.change}
            </Text>
          </Text>
          {start.isError ? (
            <ErrorText>{errorMessage(start.error)}</ErrorText>
          ) : failed ? (
            <Text size="small" tone="muted" accessibilityRole="alert">
              {copy.failed}{' '}
              <Text
                size="small"
                accessibilityRole="button"
                className="underline"
                onPress={() => field.current?.focus()}
              >
                {copy.fixIt}
              </Text>
              {' · '}
              <Text
                size="small"
                accessibilityRole="link"
                className="underline"
                onPress={() => router.replace({ pathname: '/wardrobe/manual', params: { to } })}
              >
                {wardrobe.add.review.fillIn}
              </Text>
            </Text>
          ) : null}
        </ScrollView>
        <PinnedAction>
          <Button
            disabled={empty || reading}
            loading={reading}
            loadingLabel={copy.reading}
            onPress={() => start.mutate({ input: { url: url.trim(), as: to } })}
          >
            {copy.read}
          </Button>
        </PinnedAction>
      </KeyboardAvoidingView>
    </PrimaryScope>
  );
}
