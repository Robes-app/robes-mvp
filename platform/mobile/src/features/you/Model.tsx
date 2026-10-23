import { useApi } from '@robes/api-client/react';
import type { Model as ModelData } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import {
  Button,
  EmptyState,
  Image,
  MIN_TOUCH,
  PrimaryScope,
  Skeleton,
  Text,
  useColor,
} from '@robes/ui-native';
import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { lineSummary, useDrawTwin, useModel, useModelPick } from './twin';

const copy = you.model;
const tw = twin.twinPage;

function Door({ label, sub, href }: { label: string; sub: string; href: Href }) {
  const router = useRouter();
  const muted = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${sub}`}
      onPress={() => router.push(href)}
      style={{ minHeight: Math.max(MIN_TOUCH, 76) }}
      className="flex-row items-center justify-between gap-4 border-b border-hairline px-4 py-3.5"
    >
      <View className="flex-1 gap-0.5">
        <Text className="font-display text-xl">{label}</Text>
        <Text size="small" tone="muted">
          {sub}
        </Text>
      </View>
      <Icon name="forward" color={muted} size={18} />
    </Pressable>
  );
}

// You › Your digital twin (legacy 2026-10-20 redline 3a): her model as the hero, then two doors —
// Colouring (one close-up) and Body shape (her line, by hand). No full-length photograph.
export function Model() {
  const query = useModel();
  const style = useApi('me.style.get');
  const dna = useApi('me.dna.get');
  const { pick, pending } = useModelPick();
  useDrawTwin('mount');
  if (query.isError) return <EmptyState title={errorMessage(query.error)} />;
  const model = query.data;
  if (!model || !style.data || !dna.data) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  const colour = style.data.colour;
  const line = lineSummary(dna.data.facts);
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <Stage model={model} />
      {!model.filed ? (
        <PrimaryScope>
          <Button loading={pending} onPress={() => pick({})}>
            {copy.build}
          </Button>
        </PrimaryScope>
      ) : null}
      <View className="rounded-soft border border-hairline bg-surface">
        <Door
          label={tw.colouring}
          sub={
            colour
              ? [colour.season, colour.undertone, colour.contrast].filter(Boolean).join(' · ')
              : tw.colouringSub
          }
          href="/you/model/colouring"
        />
        <Door label={tw.bodyShape} sub={line || tw.bodyShapeSub} href="/you/model/body" />
      </View>
    </ScrollView>
  );
}

// The twin when she has one (dimmed while a newer one draws), else the catalog portrait.
function Stage({ model }: { model: ModelData }) {
  const image = model.twin.imageUrl ?? model.cell.imageUrl;
  const drawing = model.twin.status === 'pending' || model.cell.status === 'pending';
  const failed =
    model.twin.status === 'failed' || (!model.twin.imageUrl && model.cell.status === 'failed');
  return (
    <View className="gap-2">
      {image ? (
        <View style={{ opacity: drawing && !model.twin.current ? 0.6 : 1 }}>
          <Image source={image} alt={copy.imageAlt} />
        </View>
      ) : (
        <Skeleton width="100%" aspectRatio={4 / 5} />
      )}
      <Text italic className="font-display text-xl">
        {tw.caption(copy.skinNames[model.skin] ?? '', copy.hairNames[model.hair] ?? '')}
      </Text>
      {drawing ? (
        <Text tone="muted" accessibilityLiveRegion="polite">
          {tw.drawing}
        </Text>
      ) : failed ? (
        <Text tone="muted">{tw.twinFailed}</Text>
      ) : null}
    </View>
  );
}
