import { queryKeys, useApi } from '@robes/api-client/react';
import type { Facts, Model as ModelData } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { chosenTones } from '@robes/core/avatar';
import { EmptyState, Image, Skeleton, Text, useColor } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { errorMessage } from '@/lib/errors';
import { SettingsGroup, SettingsRow } from './Settings';
import { Figure, lineSummary, type TwinRead, twinRead, useDrawTwin, useModel } from './twin';

const copy = you.model;
const tw = twin.twinPage;

// You › Your digital twin (legacy 2026-10-20 redline 3a): her model as the hero, then two doors —
// Colouring (one close-up) and Body shape (her line, by hand). No full-length photograph.
export function Model() {
  const router = useRouter();
  const query = useModel();
  const style = useApi('me.style.get');
  const dna = useApi('me.dna.get');
  const queryClient = useQueryClient();
  useDrawTwin('mount');
  // The doors read what Colouring and Body shape just wrote: a read landing elsewhere (the web, or
  // the screen she came back from) must show on the door, never a cached "One close-up reads…".
  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.style.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.dna.get') });
    }, [queryClient]),
  );
  if (query.isError) return <EmptyState title={errorMessage(query.error)} />;
  const model = query.data;
  if (!model || !style.data || !dna.data)
    return <Skeleton width="100%" height={440} className="rounded-none" />;
  const colour = style.data.colour;
  const line = lineSummary(dna.data.facts);
  const read = twinRead(model, dna.data.facts);
  return (
    // The hero is full-bleed, so the gutter belongs to what sits under it.
    <ScrollView contentContainerClassName="pb-12">
      <Stage model={model} facts={dna.data.facts} read={read} />
      <View className="gap-[22px] px-6 pt-6">
        <SettingsGroup title={tw.readFrom}>
          <SettingsRow
            first
            label={tw.colouring}
            sub={
              colour
                ? [colour.undertone, colour.contrast].filter(Boolean).join(' · ')
                : tw.colouringSub
            }
            value={colour?.season ?? ''}
            onPress={() => router.push('/you/model/colouring')}
          />
          <SettingsRow
            label={tw.bodyShape}
            sub={line || tw.bodyShapeSub}
            onPress={() => router.push('/you/model/body')}
          />
        </SettingsGroup>
        {/* Her model's own line: what Robes drew her from. With nothing on file the hero says it. */}
        {read === 'none' ? null : (
          <Text italic size="small" tone="faint" className="text-center">
            {tw.status(model.presence, read)}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// The hero (legacy .tw-stage): 440 tall, full-bleed and flush under the header, with a 90px fade to
// the ground at its foot carrying the caption — her colour words, never a shape.
function Stage({ model, facts, read }: { model: ModelData; facts: Facts; read: TwinRead }) {
  const empty = read === 'none';
  // Nothing on file: the empty figure alone, never a catalog portrait of someone who isn't her.
  const image = empty ? null : (model.twin.imageUrl ?? model.cell.imageUrl);
  const chosen = chosenTones(model);
  const caption = tw.caption(
    chosen.skin === null ? '' : (copy.skinNames[chosen.skin] ?? ''),
    chosen.hair === null ? '' : (copy.hairNames[chosen.hair] ?? ''),
  );
  const drawing = model.twin.status === 'pending' || model.cell.status === 'pending';
  const failed =
    model.twin.status === 'failed' || (!model.twin.imageUrl && model.cell.status === 'failed');
  return (
    <View className="gap-2">
      <View className="h-[440px] overflow-hidden bg-surface-sunk">
        {/* Her shape under the photograph: the ghost until anything is on file. */}
        <View className="absolute inset-0" style={{ opacity: empty ? 0.22 : 1 }}>
          <Figure
            facts={facts}
            adj={model.adj}
            tone={{
              skin: model.swatches.skin[model.skin] ?? '',
              hair: model.swatches.hair[model.hair] ?? '',
            }}
          />
        </View>
        {image ? (
          <View
            className="absolute inset-0"
            style={{ opacity: drawing && !model.twin.current ? 0.6 : 1 }}
          >
            <Image source={image} alt={copy.imageAlt} className="h-full" />
          </View>
        ) : null}
        <StageFade />
        {drawing ? (
          // The chip on the stage while she is drawn (legacy .mv-photo-busy).
          <View className="absolute top-4 right-3.5 rounded-pill border border-hairline bg-bg px-3.5 py-2">
            <Text
              size="caption"
              className="text-[10px] uppercase"
              accessibilityLiveRegion="polite"
              style={{ letterSpacing: 1.6 }}
            >
              {tw.drawing}
            </Text>
          </View>
        ) : null}
        {empty ? (
          // Nothing on file: the invitation sits in the stage, over the ghost figure.
          <View className="absolute inset-0 items-center justify-center px-[34px]">
            <Text italic size="caption" tone="faint" className="text-center">
              {tw.stageEmpty}
            </Text>
          </View>
        ) : caption ? (
          <Text italic className="absolute right-5 bottom-[18px] left-5">
            {caption}
          </Text>
        ) : null}
      </View>
      {failed && !drawing ? (
        <View className="px-6">
          <Text tone="muted">{tw.twinFailed}</Text>
        </View>
      ) : null}
    </View>
  );
}

// The fade the caption reads over: react-native-svg, so no gradient dependency. Its place rides a
// plain View — Uniwind doesn't style the Svg, which left the fade at the top, over her head.
function StageFade() {
  const ground = useColor('bg');
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 }}
    >
      <Svg height={90} width="100%">
        <Defs>
          <LinearGradient id="twin-fade" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={ground} stopOpacity={1} />
            <Stop offset="1" stopColor={ground} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="90" fill="url(#twin-fade)" />
      </Svg>
    </View>
  );
}
