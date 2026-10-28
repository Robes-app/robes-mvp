import { useApi } from '@robes/api-client/react';
import type { BriefLine } from '@robes/contracts';
import { twin } from '@robes/copy';
import { asSentence } from '@robes/core';
import { monthLong } from '@robes/core/calendar';
import {
  CardSkeleton,
  EmptyState,
  Eyebrow,
  fonts,
  IconButton,
  Progress,
  Text,
  useToast,
} from '@robes/ui-native';
import { ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useBriefRead, useDnaMutations } from './dna';
import { ObservationThumbs } from './ObservationThumbs';

const copy = twin.observations;

const keptIn = (iso: string, now = new Date()): string => {
  const d = new Date(iso);
  const month = monthLong(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  return copy.keptIn(d.getFullYear() === now.getFullYear() ? month : `${month} ${d.getFullYear()}`);
};

// You › Observations: what waits for That’s right or Not quite, then what she kept before — each
// removable, struck so it is never drafted again.
export function Observations() {
  const query = useApi('me.dna.get');
  const { reading, failed } = useBriefRead(query.data);
  const { removeLine } = useDnaMutations();
  const toast = useToast();
  if (query.isPending) return <CardSkeleton className="mx-6" />;
  if (query.isError || !query.data) return <EmptyState title={errorMessage(query.error)} />;
  const dna = query.data;
  const kept: BriefLine[] = [...dna.brief.loves, ...dna.brief.avoids, ...dna.brief.rules].filter(
    (x) => x.source !== 'typed',
  );
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <Text size="caption" tone="muted" className="text-center">
        {copy.sub}
      </Text>
      <View className="gap-3">
        <Eyebrow>{copy.since}</Eyebrow>
        {reading ? (
          <Progress stage={copy.reading} />
        ) : dna.observations.length ? (
          dna.observations.map((o) => (
            <View
              key={o.id}
              className="gap-2 rounded-soft border border-hairline bg-surface-raised p-5"
            >
              <Eyebrow>{copy.list[o.list] ?? twin.noticed.eyebrow}</Eyebrow>
              <Text className="text-xl" style={{ fontFamily: fonts.display }}>
                {asSentence(o.text)}
              </Text>
              {o.because ? (
                <Text size="small" tone="muted" italic>
                  {asSentence(o.because)}
                </Text>
              ) : null}
              <ObservationThumbs line={o} />
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
              className="flex-row items-center justify-between gap-4 border-b border-hairline py-3"
            >
              {/* The line runs the full width; what it is and when she kept it sit under it. */}
              <View className="flex-1 gap-0.5">
                <Text style={{ fontFamily: fonts.displayRegular, fontSize: 17 }}>{x.text}</Text>
                <Text italic size="caption" tone="muted">
                  {[copy.list[x.list], keptIn(x.keptAt)].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <IconButton
                icon="close"
                tone="ink-muted"
                disabled={removeLine.isPending}
                label={copy.remove(x.text)}
                onPress={() =>
                  removeLine
                    .mutateAsync({ params: { id: x.id } })
                    // A failure is already toasted by useDnaMutations.
                    .then(
                      () => toast.show({ message: copy.removed }),
                      () => {},
                    )
                }
              />
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
