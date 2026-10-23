import { useApi } from '@robes/api-client/react';
import type { Model as ModelData } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { EmptyState, Image, MIN_TOUCH, Skeleton, Text, useColor } from '@robes/ui-native';
import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { errorMessage } from '@/lib/errors';
import { lineSummary, useDrawTwin, useModel } from './twin';

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
  useDrawTwin('mount');
  if (query.isError) return <EmptyState title={errorMessage(query.error)} />;
  const model = query.data;
  if (!model || !style.data || !dna.data) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  const colour = style.data.colour;
  const line = lineSummary(dna.data.facts);
  return (
    // The hero is full-bleed, so the gutter belongs to what sits under it.
    <ScrollView contentContainerClassName="pb-12">
      <Stage model={model} />
      <View className="px-6 pt-6">
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
      </View>
    </ScrollView>
  );
}

// The hero (legacy .tw-stage): 440 tall, full-bleed and flush under the header, with a 90px fade to
// the ground at its foot carrying the caption — her colour words, never a shape.
function Stage({ model }: { model: ModelData }) {
  const image = model.twin.imageUrl ?? model.cell.imageUrl;
  const drawing = model.twin.status === 'pending' || model.cell.status === 'pending';
  const failed =
    model.twin.status === 'failed' || (!model.twin.imageUrl && model.cell.status === 'failed');
  return (
    <View className="gap-2">
      <View className="h-[440px] overflow-hidden bg-surface-sunk">
        {image ? (
          <View
            className="absolute inset-0"
            style={{ opacity: drawing && !model.twin.current ? 0.6 : 1 }}
          >
            <Image source={image} alt={copy.imageAlt} className="h-full" />
          </View>
        ) : (
          <Skeleton width="100%" height="100%" shape="text" className="rounded-none" />
        )}
        <StageFade />
        <Text italic className="absolute right-5 bottom-[18px] left-5 font-display text-xl">
          {tw.caption(copy.skinNames[model.skin] ?? '', copy.hairNames[model.hair] ?? '')}
        </Text>
      </View>
      <View className="px-6">
        {drawing ? (
          <Text tone="muted" accessibilityLiveRegion="polite">
            {tw.drawing}
          </Text>
        ) : failed ? (
          <Text tone="muted">{tw.twinFailed}</Text>
        ) : null}
      </View>
    </View>
  );
}

// The fade the caption reads over: react-native-svg, so no gradient dependency.
function StageFade() {
  const ground = useColor('bg');
  return (
    <Svg height={90} width="100%" pointerEvents="none" className="absolute inset-x-0 bottom-0">
      <Defs>
        <LinearGradient id="twin-fade" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={ground} stopOpacity={1} />
          <Stop offset="1" stopColor={ground} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="90" fill="url(#twin-fade)" />
    </Svg>
  );
}
