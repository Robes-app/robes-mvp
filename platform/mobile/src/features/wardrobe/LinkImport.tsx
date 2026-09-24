import { useApi, useApiMutation } from '@robes/api-client/react';
import { wardrobe as copy } from '@robes/copy';
import {
  Button,
  Eyebrow,
  Field,
  Heading,
  PrimaryScope,
  SegmentedControl,
  Text,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { isTerminal } from '../looks/ideas';
import { JOB_POLL_MS } from './inbox';

type Destination = 'wardrobe' | 'wishlist';

// Paste a link (M3 task 9): the isolated fetcher reads the page; the piece waits in the Inbox.
export function LinkImport() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [as, setAs] = useState<Destination>('wardrobe');
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
  const status = job.data?.status;
  const reading = jobId !== '' && !isTerminal(job.data);

  return (
    <View className="gap-4 px-6 py-6">
      <Eyebrow>{copy.link.eyebrow}</Eyebrow>
      <Heading size="lg">{copy.link.title}</Heading>
      {status === 'succeeded' ? (
        <>
          <Text accessibilityRole="text">{copy.link.done}</Text>
          <Button
            onPress={() => router.replace({ pathname: '/wardrobe', params: { segment: 'inbox' } })}
          >
            {copy.link.openInbox}
          </Button>
        </>
      ) : (
        <PrimaryScope>
          <View className="gap-4">
            <Field
              label={copy.link.label}
              placeholder={copy.link.placeholder}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              maxLength={2048}
              error={
                start.isError
                  ? errorMessage(start.error)
                  : status === 'failed'
                    ? copy.link.failed
                    : null
              }
            />
            <SegmentedControl<Destination>
              label={copy.link.as}
              value={as}
              onChange={setAs}
              options={[
                { value: 'wardrobe', label: copy.link.toWardrobe },
                { value: 'wishlist', label: copy.link.toWishlist },
              ]}
            />
            {reading ? <Text tone="muted">{copy.link.reading}</Text> : null}
            <Button
              icon="link"
              disabled={url.trim() === '' || reading}
              loading={start.isPending}
              loadingLabel={copy.link.starting}
              onPress={() => start.mutate({ input: { url: url.trim(), as } })}
            >
              {copy.link.start}
            </Button>
          </View>
        </PrimaryScope>
      )}
    </View>
  );
}
