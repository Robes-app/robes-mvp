import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { StyleProfile } from '@robes/contracts';
import { you } from '@robes/copy';
import { Eyebrow, Heading, Text, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { isTerminal, JOB_REFRESH_MS } from '@/features/looks/ideas';
import { PICKER_OPTIONS, uploadPhoto } from '@/features/wardrobe/add-pieces';

const copy = you.style;
type Kind = 'colour' | 'silhouette';
const PHOTO_KIND = { colour: 'headshot', silhouette: 'full_length' } as const;

// Swatch colours are her profile's data from the API, not design tokens.
function Swatches({
  label,
  swatches,
}: {
  label: string;
  swatches: { name: string; hex: string }[];
}) {
  return (
    <View className="gap-2">
      <Eyebrow>{label}</Eyebrow>
      <View className="flex-row flex-wrap gap-3">
        {swatches.map((s) => (
          <View key={s.name} className="items-center gap-1" style={{ width: 64 }}>
            <View
              accessibilityElementsHidden
              className="rounded-full border border-hairline"
              style={{ width: 36, height: 36, backgroundColor: s.hex }}
            />
            <Text size="caption" numberOfLines={2}>
              {s.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// The colour notes (4b): what the season wears, its neutrals, what to go easy on and its metals.
// Twin of web you/style/style-profile.tsx ColourResult.
export function ColourResult({ colour }: { colour: NonNullable<StyleProfile['colour']> }) {
  return (
    <View className="gap-4">
      <Heading size="md">{colour.season}</Heading>
      <Text>{colour.summary}</Text>
      <Text size="small" tone="muted">
        {colour.undertone_note}
      </Text>
      <Swatches label={copy.best} swatches={colour.best_colours} />
      <Swatches label={copy.neutrals} swatches={colour.neutrals} />
      <Swatches label={copy.avoid} swatches={colour.avoid_colours} />
      <Swatches
        label={copy.metals}
        swatches={colour.metals.map((m) => ({ name: m.name, hex: m.hexes[1] ?? m.hexes[0] ?? '' }))}
      />
    </View>
  );
}

// Photo → upload → analysis job, polled until it lands on the profile. The close-up card
// (Colouring) is its one door.
export function useAnalyse(kind: Kind) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [noSubject, setNoSubject] = useState(false);
  const job = useApi(
    'jobs.get',
    { params: { id: jobId ?? '' } },
    {
      enabled: jobId !== null,
      refetchInterval: (q) => (isTerminal(q.state.data) ? false : JOB_REFRESH_MS),
    },
  );
  const finished = jobId !== null && isTerminal(job.data);
  useEffect(() => {
    if (!finished || !job.data) return;
    setNoSubject(job.data.output.noSubject === true);
    if (job.data.status === 'failed') toast.show({ message: copy.failed });
    setJobId(null);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.style.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.model.get') });
  }, [finished, job.data, queryClient, toast]);

  async function start() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const photo = result.canceled ? undefined : result.assets[0];
    if (!photo) return;
    setBusy(true);
    setNoSubject(false);
    try {
      const assetId = await uploadPhoto(api, photo, PHOTO_KIND[kind]);
      const started = await api.call('me.style.analyse', { input: { kind, assetId } });
      setJobId(started.jobId);
    } catch {
      toast.show({ message: copy.failed });
    } finally {
      setBusy(false);
    }
  }
  return { start, busy, reading: jobId !== null, noSubject };
}
