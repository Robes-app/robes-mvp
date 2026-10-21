import type { DailyItem } from '@robes/contracts';
import { today } from '@robes/copy';
import {
  Button,
  ErrorText,
  Eyebrow,
  Field,
  Heading,
  Image,
  PrimaryScope,
  Progress,
  Skeleton,
  Text,
} from '@robes/ui-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { useRenderDailyItem } from '../looks/frame-render';
import { useDailyLook, useJobDaily, useSaveDaily, weatherLine } from './daily';

const copy = today.daily;

// Robes' picture of a suggested item, rendered when she asks (UX-09); the anchor shows above.
function ItemFrame({
  item,
  onShow,
  showing,
}: {
  item: DailyItem;
  onShow: () => void;
  showing: boolean;
}) {
  const uri = item.imageStatus === 'ready' ? renditionUri(item.image, 80) : null;
  if (uri) {
    return <Image source={uri} alt={copy.itemAlt(item.name)} blurhash={item.image?.blurhash} />;
  }
  if (item.imageStatus === 'deferred' || item.imageStatus === 'failed') {
    return (
      <Button
        variant="quiet"
        onPress={onShow}
        loading={showing}
        loadingLabel={copy.showItem}
        accessibilityHint={item.name}
      >
        {copy.showItem}
      </Button>
    );
  }
  return <Skeleton width="100%" aspectRatio={4 / 5} />;
}

function ItemRow({
  item,
  isAnchor,
  onShow,
  showing,
}: {
  item: DailyItem;
  isAnchor: boolean;
  onShow: () => void;
  showing: boolean;
}) {
  const uri = item.piece ? renditionUri(item.piece.image, 80) : null;
  const shop = [item.brand, item.pricePoint].filter(Boolean).join(' · ');
  return (
    <View className="flex-row gap-3 border-b border-hairline py-3">
      {!item.piece && !isAnchor ? (
        <View style={{ width: 64 }}>
          <ItemFrame item={item} onShow={onShow} showing={showing} />
        </View>
      ) : null}
      {uri ? (
        <View style={{ width: 64 }}>
          <Image
            source={uri}
            alt={item.piece?.label ?? ''}
            blurhash={item.piece?.image?.blurhash}
          />
        </View>
      ) : null}
      <View className="flex-1 gap-1">
        <Text>{item.piece ? `${item.piece.label} · ${copy.yours}` : item.name}</Text>
        {!item.piece && shop ? <Text tone="muted">{shop}</Text> : null}
        {item.how ? <Text size="caption">{item.how}</Text> : null}
        {!item.piece && item.alternates.length > 0 ? (
          <Text tone="muted" size="caption">
            {`${copy.alternates} ${item.alternates
              .slice(0, 3)
              .map((a) => [a.name, a.brand].filter(Boolean).join(', '))
              .join(' · ')}`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function DailySkeleton() {
  return (
    <View accessibilityState={{ busy: true }} className="gap-4 px-6 py-6">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="h-24 w-full" />
    </View>
  );
}

// The daily look: four steps, her pieces where she owns them, saved when she names it.
export function DailyLookView({ id }: { id: string }) {
  const query = useDailyLook(id);
  const save = useSaveDaily();
  const frames = useRenderDailyItem(id);
  const [name, setName] = useState<string | null>(null);
  if (query.isError) {
    return (
      <View className="px-6 py-6">
        <ErrorText>{errorMessage(query.error)}</ErrorText>
      </View>
    );
  }
  const look = query.data;
  if (!look) return <DailySkeleton />;
  const anchor = look.steps[0]?.items[0];
  const frame = renditionUri(anchor?.image, 360);
  const weather = weatherLine(look.weather);
  const value = name ?? look.headline;
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 py-6" keyboardShouldPersistTaps="handled">
      <View className="gap-2">
        <Eyebrow>{look.occasionLabel || copy.eyebrow}</Eyebrow>
        <Heading size="xl">{look.headline}</Heading>
        {weather ? <Text tone="muted">{weather}</Text> : null}
      </View>
      {frame ? (
        <Image
          source={frame}
          alt={copy.imageAlt(look.headline)}
          blurhash={anchor?.image?.blurhash}
        />
      ) : anchor?.image?.status === 'failed' ? null : (
        <Skeleton className="aspect-[4/5] w-full" />
      )}
      {look.stylistSummary ? <Text>{look.stylistSummary}</Text> : null}
      {look.steps.map((step) => (
        <View key={step.title} className="gap-1">
          <Heading size="md">{copy.steps[step.title]}</Heading>
          {step.items.map((item) => (
            <ItemRow
              key={item.imageIndex}
              item={item}
              isAnchor={item.imageIndex === anchor?.imageIndex}
              onShow={() => frames.start(item.imageIndex)}
              showing={frames.renderingIdx === item.imageIndex}
            />
          ))}
        </View>
      ))}
      {look.transitionTip ? (
        <View className="gap-1">
          <Heading size="md">{copy.transition}</Heading>
          <Text>{look.transitionTip}</Text>
        </View>
      ) : null}
      <Field label={copy.nameLabel} value={value} onChangeText={setName} maxLength={120} />
      {save.isError ? <ErrorText>{errorMessage(save.error)}</ErrorText> : null}
      <PrimaryScope>
        <Button
          onPress={() => save.mutate({ params: { id }, input: { name: value.trim() } })}
          disabled={!value.trim()}
          loading={save.isPending || save.isSuccess}
          loadingLabel={copy.saving}
        >
          {copy.save}
        </Button>
      </PrimaryScope>
    </ScrollView>
  );
}

// Progress by job id until the draft look exists.
export function DailyJobView({ jobId }: { jobId: string }) {
  const { job, dailyLookId, failed } = useJobDaily(jobId);
  if (dailyLookId) return <DailyLookView id={dailyLookId} />;
  if (failed || job.isError) {
    return (
      <View className="px-6 py-6">
        <ErrorText>{copy.failed}</ErrorText>
      </View>
    );
  }
  return (
    <View className="gap-6">
      <View className="px-6 pt-6">
        <Progress stage="styling" />
      </View>
      <DailySkeleton />
    </View>
  );
}
