import { useApi } from '@robes/api-client/react';
import type { BriefLine } from '@robes/contracts';
import { twin } from '@robes/copy';
import { asSentence } from '@robes/core';
import { Button, CardSkeleton, EmptyState, Eyebrow, fonts, Progress, Text } from '@robes/ui-native';
import { ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useBriefRead, useDnaMutations } from './dna';

const copy = twin.observations;

const keptIn = (iso: string, now = new Date()): string => {
  const d = new Date(iso);
  const month = d.toLocaleString('en-GB', { month: 'long' });
  return copy.keptIn(d.getFullYear() === now.getFullYear() ? month : `${month} ${d.getFullYear()}`);
};

// You › Robes Observations: what waits for Keep or Not me, then what she kept before.
export function Observations() {
  const query = useApi('me.dna.get');
  const { reading, failed } = useBriefRead(query.data);
  const { keep, dismiss } = useDnaMutations();
  if (query.isPending) return <CardSkeleton className="mx-6" />;
  if (query.isError || !query.data) return <EmptyState title={errorMessage(query.error)} />;
  const dna = query.data;
  const busy = keep.isPending || dismiss.isPending;
  const kept: BriefLine[] = [...dna.brief.loves, ...dna.brief.avoids, ...dna.brief.rules].filter(
    (x) => x.source !== 'typed',
  );
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <Text tone="muted">{copy.sub}</Text>
      <View className="gap-3">
        <Eyebrow>{copy.since}</Eyebrow>
        {reading ? (
          <Progress stage={copy.reading} />
        ) : dna.observations.length ? (
          dna.observations.map((o) => (
            <View key={o.id} className="gap-2 rounded-crisp border border-hairline bg-surface p-5">
              <Eyebrow>{copy.list[o.list] ?? twin.noticed.eyebrow}</Eyebrow>
              <Text className="text-xl" style={{ fontFamily: fonts.display }}>
                {asSentence(o.text)}
              </Text>
              {o.because ? (
                <Text size="small" tone="muted" italic>
                  {asSentence(o.because)}
                </Text>
              ) : null}
              <View className="flex-row items-center gap-4">
                <Button
                  variant="secondary"
                  disabled={busy}
                  onPress={() => keep.mutate({ params: { id: o.id } })}
                >
                  {copy.keep}
                </Button>
                <Button
                  variant="quiet"
                  disabled={busy}
                  onPress={() => dismiss.mutate({ params: { id: o.id } })}
                >
                  {copy.notMe}
                </Button>
              </View>
            </View>
          ))
        ) : (
          <Text tone="muted" italic>
            {failed ? copy.failed : copy.empty}
          </Text>
        )}
      </View>
      {kept.length ? (
        <View className="gap-2">
          <Eyebrow>{copy.keptBefore}</Eyebrow>
          {kept.map((x) => (
            <View
              key={x.id}
              className="flex-row items-baseline justify-between gap-4 border-b border-hairline py-3"
            >
              <View className="flex-1">
                <Text>{x.text}</Text>
                <Text size="caption" tone="muted">
                  {copy.list[x.list]}
                </Text>
              </View>
              <Text size="caption" tone="faint">
                {keptIn(x.keptAt)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
