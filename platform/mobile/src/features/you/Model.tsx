import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { UpdateModelInput } from '@robes/contracts';
import { you } from '@robes/copy';
import {
  Button,
  EmptyState,
  Eyebrow,
  Image,
  PrimaryScope,
  SegmentedControl,
  Skeleton,
  Text,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';

const copy = you.model;

// Swatch colours are catalog data (like the style swatches), the one place colour comes inline.
function SwatchRow(props: {
  label: string;
  hexes: string[];
  names: readonly string[];
  value: number;
  onPick: (i: number) => void;
}) {
  return (
    <View className="gap-2">
      <Text size="small" tone="muted">
        {props.label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {props.hexes.map((hex, i) => (
          <Pressable
            key={hex}
            accessibilityRole="button"
            accessibilityLabel={props.names[i] ?? hex}
            accessibilityState={{ selected: i === props.value }}
            onPress={() => props.onPick(i)}
            className={`rounded-full border ${i === props.value ? 'border-ink' : 'border-hairline'}`}
            style={{
              width: 44,
              height: 44,
              backgroundColor: hex,
              borderWidth: i === props.value ? 2 : 1,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// You › Your model: the same picks as the web, re-filed on every change; polls while drawn.
export function Model() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useApi('me.model.get', undefined, {
    refetchInterval: (q) => (q.state.data?.cell.status === 'pending' ? 3_000 : false),
  });
  const update = useApiMutation('me.model.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('me.model.get'), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
    },
    onError: (err) => toast.show({ message: errorMessage(err) }),
  });
  if (query.isError) return <EmptyState title={errorMessage(query.error)} />;
  const model = query.data;
  if (!model) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  const pick = (input: UpdateModelInput) => update.mutate({ input });

  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <Eyebrow>{copy.source[model.source]}</Eyebrow>
      {model.cell.imageUrl ? (
        <Image source={model.cell.imageUrl} alt={copy.imageAlt} />
      ) : (
        <Skeleton width="100%" aspectRatio={4 / 5} />
      )}
      {model.cell.status === 'pending' ? (
        <Text tone="muted" accessibilityLiveRegion="polite">
          {copy.creating}
        </Text>
      ) : model.cell.status === 'failed' ? (
        <Text tone="muted">{copy.failed}</Text>
      ) : null}
      <Text tone="muted">{model.filed ? copy.subtitle : copy.empty}</Text>
      {!model.filed ? (
        <PrimaryScope>
          <Button loading={update.isPending} onPress={() => pick({})}>
            {copy.build}
          </Button>
        </PrimaryScope>
      ) : null}
      <SegmentedControl
        label={copy.presence}
        value={model.presence}
        options={(['woman', 'man', 'unspecified'] as const).map((value) => ({
          value,
          label: copy.presenceOptions[value],
        }))}
        onChange={(presence) => pick({ presence })}
      />
      <SwatchRow
        label={copy.skin}
        hexes={model.swatches.skin}
        names={copy.skinNames}
        value={model.skin}
        onPick={(skin) => pick({ skin })}
      />
      <SwatchRow
        label={copy.hair}
        hexes={model.swatches.hair}
        names={copy.hairNames}
        value={model.hair}
        onPick={(hair) => pick({ hair })}
      />
      <SegmentedControl
        label={copy.line}
        value={model.line ?? 'none'}
        options={(['soft', 'none', 'straight'] as const).map((value) => ({
          value,
          label: copy.lineOptions[value],
        }))}
        onChange={(line) => pick({ line: line === 'none' ? null : line })}
      />
      <SegmentedControl
        label={copy.frame}
        value={model.frame ?? 'none'}
        options={(['fuller', 'none', 'narrower'] as const).map((value) => ({
          value,
          label: copy.frameOptions[value],
        }))}
        onChange={(frame) => pick({ frame: frame === 'none' ? null : frame })}
      />
      {!model.reads.colour || !model.reads.silhouette ? (
        <Button variant="quiet" className="self-start" onPress={() => router.push('/you/style')}>
          {copy.photos}
        </Button>
      ) : null}
    </ScrollView>
  );
}
