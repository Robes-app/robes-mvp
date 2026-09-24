import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { StyleProfile } from '@robes/contracts';
import { errors, ui, you } from '@robes/copy';
import {
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  Eyebrow,
  Field,
  Heading,
  Pill,
  Progress,
  Text,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { isTerminal, JOB_REFRESH_MS } from '@/features/looks/ideas';
import { PICKER_OPTIONS, uploadPhoto } from '@/features/wardrobe/add-pieces';
import { errorMessage } from '@/lib/errors';

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

function ColourResult({ colour }: { colour: NonNullable<StyleProfile['colour']> }) {
  return (
    <View className="gap-4">
      <Heading size="md">{colour.season}</Heading>
      <Text>{colour.summary}</Text>
      <Swatches label={copy.best} swatches={colour.best_colours} />
      <Swatches label={copy.avoid} swatches={colour.avoid_colours} />
      <View className="gap-1">
        <Eyebrow>{copy.metals}</Eyebrow>
        <Text>{colour.metals.map((m) => m.name).join(', ')}</Text>
      </View>
    </View>
  );
}

function SilhouetteResult({ silhouette }: { silhouette: NonNullable<StyleProfile['silhouette']> }) {
  return (
    <View className="gap-3">
      <Heading size="md">{silhouette.body_type}</Heading>
      <Text>{silhouette.summary}</Text>
      {silhouette.styling_tips.map((tip) => (
        <Text key={tip} size="small">
          {tip}
        </Text>
      ))}
    </View>
  );
}

// Photo → upload → analysis job, polled until it lands on the profile.
function useAnalyse(kind: Kind) {
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

function AnalysisCard({ kind, profile }: { kind: Kind; profile: StyleProfile }) {
  const text = copy[kind];
  const { start, busy, reading, noSubject } = useAnalyse(kind);
  const has = kind === 'colour' ? profile.colour : profile.silhouette;
  return (
    <Card className="gap-4 p-5" testID={`style-${kind}`}>
      <Eyebrow>{text.title}</Eyebrow>
      {reading ? <Progress stage={text.reading} /> : null}
      {noSubject ? <Text tone="danger">{text.noSubject}</Text> : null}
      {profile.colour && kind === 'colour' ? <ColourResult colour={profile.colour} /> : null}
      {profile.silhouette && kind === 'silhouette' ? (
        <SilhouetteResult silhouette={profile.silhouette} />
      ) : null}
      {!has ? <Text tone="muted">{text.body}</Text> : null}
      <Button
        variant="secondary"
        loading={busy || reading}
        loadingLabel={ui.loading}
        onPress={() => void start()}
      >
        {has ? copy.again : text.add}
      </Button>
    </Card>
  );
}

function ColourList({
  label,
  colours,
  onChange,
}: {
  label: string;
  colours: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const name = draft.trim();
    if (!name || colours.includes(name)) return;
    onChange([...colours, name]);
    setDraft('');
  };
  return (
    <View className="gap-3">
      <Eyebrow>{label}</Eyebrow>
      <View className="flex-row flex-wrap gap-2">
        {colours.map((c) => (
          <Pill key={c} selected onPress={() => onChange(colours.filter((x) => x !== c))}>
            {c}
          </Pill>
        ))}
      </View>
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <Field
            label={`${label}: ${copy.colourLabel}`}
            placeholder={copy.colourPlaceholder}
            value={draft}
            onChangeText={setDraft}
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={add}
          />
        </View>
        <Button variant="secondary" onPress={add} disabled={!draft.trim()}>
          {copy.add}
        </Button>
      </View>
    </View>
  );
}

// You › Style: her colouring and shape from photos, and the colours she's corrected by hand.
export function Style() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: profile, isPending, isError, error } = useApi('me.style.get');
  const overrides = useApiMutation('me.style.overrides', {
    onSuccess: (next) => queryClient.setQueryData(queryKeys.call('me.style.get'), next),
    onError: () => toast.show({ message: errors.internal }),
  });
  if (isPending) return <CardSkeleton className="mx-6" />;
  if (isError || !profile) return <EmptyState title={errorMessage(error)} />;
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <AnalysisCard kind="colour" profile={profile} />
      <AnalysisCard kind="silhouette" profile={profile} />
      <ColourList
        label={copy.loved}
        colours={profile.overrides.lovedColors}
        onChange={(lovedColors) => overrides.mutate({ input: { lovedColors } })}
      />
      <ColourList
        label={copy.rejected}
        colours={profile.overrides.rejectedColors}
        onChange={(rejectedColors) => overrides.mutate({ input: { rejectedColors } })}
      />
    </ScrollView>
  );
}
