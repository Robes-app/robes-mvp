import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { DataExport } from '@robes/contracts';
import { consent as copy, you } from '@robes/copy';
import { Button, ErrorText, Text } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Linking, ScrollView, View } from 'react-native';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useConsents } from '@/lib/consents';
import { errorMessage } from '@/lib/errors';
import { SettingsGroup, SettingsToggleRow } from './Settings';

export function Privacy() {
  const { consents, give, error } = useConsents();
  if (!consents) return <LoadingScreen />;

  return (
    <ScrollView contentContainerClassName="gap-3 px-6 pt-6 pb-12">
      <SettingsGroup>
        <SettingsToggleRow
          first
          label={copy.analyticsLabel}
          sub={copy.analyticsHint}
          value={consents.analytics === true}
          // Recordings need usage counts, so turning counts off withdraws both.
          onChange={(v) => give(v ? { analytics: true } : { analytics: false, replay: false })}
        />
        <SettingsToggleRow
          label={copy.replayLabel}
          sub={copy.replayHint}
          value={consents.replay === true}
          disabled={consents.analytics !== true}
          onChange={(v) => give({ replay: v })}
        />
      </SettingsGroup>
      {error ? <ErrorText>{errorMessage(error)}</ErrorText> : null}
      <DownloadData />
    </ScrollView>
  );
}

const exportCopy = you.dataExport;
const REFRESH_MS = 3_000;
const pending = (e: DataExport | null | undefined) =>
  e?.status === 'requested' || e?.status === 'running';

// SEC-81: request → preparing → a short-lived link, opened in the browser to download. Web twin:
// app/(app)/you/download-data.tsx.
export function DownloadData() {
  const queryClient = useQueryClient();
  const status = useApi('me.exports.get', undefined, {
    refetchInterval: (q) => (pending(q.state.data?.export) ? REFRESH_MS : false),
  });
  const request = useApiMutation('me.exports.request', {
    onSuccess: (data) =>
      queryClient.setQueryData(queryKeys.call('me.exports.get'), { export: data }),
  });
  const current = status.data?.export ?? null;
  const canRequest = !current || current.status === 'expired' || current.status === 'failed';
  const url = current?.status === 'ready' ? current.downloadUrl : null;

  return (
    <SettingsGroup title={exportCopy.title}>
      <View className="items-start gap-2 px-4 py-3.5" accessibilityLiveRegion="polite">
        <Text size="small" tone="muted">
          {exportCopy.body}
        </Text>
        {pending(current) ? <Text size="small">{exportCopy.preparing}</Text> : null}
        {current?.status === 'failed' ? <Text size="small">{exportCopy.failed}</Text> : null}
        {current?.status === 'expired' ? <Text size="small">{exportCopy.expired}</Text> : null}
        {url ? (
          <>
            <Text size="small">{exportCopy.ready}</Text>
            <Button variant="outline" onPress={() => void Linking.openURL(url)}>
              {exportCopy.download}
            </Button>
          </>
        ) : null}
        {canRequest ? (
          <Button
            variant="outline"
            loading={request.isPending}
            loadingLabel={exportCopy.requesting}
            onPress={() => request.mutate({})}
          >
            {current ? exportCopy.again : exportCopy.request}
          </Button>
        ) : null}
        {request.isError ? <ErrorText>{errorMessage(request.error)}</ErrorText> : null}
      </View>
    </SettingsGroup>
  );
}
