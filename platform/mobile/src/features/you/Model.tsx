import { queryKeys, useApi } from '@robes/api-client/react';
import type { Facts, Model as ModelData } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { chosenTones } from '@robes/core/avatar';
import { Icon } from '@robes/icons/native';
import { EmptyState, ErrorText, Image, Skeleton, Text, useColor } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { errorMessage } from '@/lib/errors';
import { SettingsGroup, SettingsRow } from './Settings';
import {
  Figure,
  Lineup,
  lineSummary,
  type TwinRead,
  twinRead,
  useDrawTwin,
  useModel,
  useModelPick,
} from './twin';
import { useSelfie, useSelfieRead } from './use-selfie';

const copy = you.model;
const tw = twin.twinPage;

// You › Your digital twin (legacy 2026-10-20 redline 3a; plan 2026-11-05 §1.4–1.5). On a Robes
// model (3c): its portrait as the hero, Add a selfie as the one commitment, the lineup, and the
// two doors closed. On her own twin (3d): the twin with its retake, the doors — Colouring (one
// selfie) and Body shape (her line, by hand) — and the lineup with her first. Web twin:
// app/src/app/(app)/you/model/model-view.tsx.
export function Model() {
  const router = useRouter();
  const query = useModel();
  const style = useApi('me.style.get');
  const dna = useApi('me.dna.get');
  const queryClient = useQueryClient();
  const { pick, pending } = useModelPick();
  const selfie = useSelfie();
  const read = useSelfieRead();
  const ink = useColor('ink');
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
  const onRobes = model.stand?.on === 'robes';
  const colour = style.data.colour;
  const line = lineSummary(dna.data.facts);
  const drewHer = twinRead(model, dna.data.facts);
  const error = read.error ?? selfie.error;
  return (
    // The hero is full-bleed, so the gutter belongs to what sits under it.
    <ScrollView contentContainerClassName="pb-12">
      <Stage
        model={model}
        facts={dna.data.facts}
        read={drewHer}
        reading={read.reading || selfie.busy}
        onRetake={onRobes ? undefined : () => void selfie.start()}
      />
      <View className="gap-[22px] px-6 pt-6">
        {error ? <ErrorText>{error}</ErrorText> : null}
        {onRobes ? (
          <SettingsGroup>
            <View className="flex-row items-center">
              <View className="flex-1">
                <SettingsRow
                  first
                  label={tw.addSelfie}
                  sub={tw.addSelfieSub}
                  onPress={() => void selfie.start()}
                  testID="twin-add-selfie"
                />
              </View>
              <View pointerEvents="none" className="absolute right-[18px]">
                <Icon name="camera" size={16} color={ink} />
              </View>
            </View>
          </SettingsGroup>
        ) : null}
        {/* Colouring and Body shape are the twin's: on a Robes model the doors stand closed. */}
        <View
          accessibilityState={{ disabled: onRobes }}
          style={{ opacity: onRobes ? 0.5 : 1 }}
          pointerEvents={onRobes ? 'none' : 'auto'}
        >
          <SettingsGroup title={onRobes ? undefined : tw.readFrom}>
            <SettingsRow
              first
              label={tw.colouring}
              sub={
                colour && !onRobes
                  ? [colour.undertone, colour.contrast].filter(Boolean).join(' · ')
                  : tw.colouringSub
              }
              value={onRobes ? '' : (colour?.season ?? '')}
              {...(onRobes ? {} : { onPress: () => router.push('/you/model/colouring') })}
            />
            <SettingsRow
              label={tw.bodyShape}
              sub={(onRobes ? '' : line) || tw.bodyShapeSub}
              {...(onRobes ? {} : { onPress: () => router.push('/you/model/body') })}
            />
          </SettingsGroup>
        </View>
        <Lineup model={model} pick={pick} pending={pending} />
        {/* Her model's own line: what Robes drew her from. With nothing on file the hero says it. */}
        {onRobes || drewHer === 'none' ? null : (
          <Text italic size="small" tone="faint" className="text-center">
            {tw.status(model.presence, drewHer)}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// The hero (legacy .tw-stage): 440 tall, full-bleed and flush under the header, with a 90px fade to
// the ground at its foot carrying the caption — her colour words, never a shape. On a Robes model,
// its portrait under a `Robes model` eyebrow; on her own, the retake bottom-right.
function Stage({
  model,
  facts,
  read,
  reading,
  onRetake,
}: {
  model: ModelData;
  facts: Facts;
  read: TwinRead;
  reading: boolean;
  onRetake?: () => void;
}) {
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  const onRobes = model.stand?.on === 'robes';
  const robesModel = onRobes ? model.robesModels.find((m) => m.n === (model.preset ?? 1)) : null;
  const empty = !onRobes && read === 'none';
  // Nothing on file: the empty figure alone, never a catalog portrait of someone who isn't her.
  const image = onRobes
    ? (model.stand?.imageUrl ?? null)
    : empty
      ? null
      : (model.twin.imageUrl ?? model.cell.imageUrl);
  const chosen = chosenTones(model);
  const caption = onRobes
    ? ''
    : tw.caption(
        chosen.skin === null ? '' : (copy.skinNames[chosen.skin] ?? ''),
        chosen.hair === null ? '' : (copy.hairNames[chosen.hair] ?? ''),
      );
  const drawing = onRobes
    ? robesModel?.status === 'pending'
    : model.twin.status === 'pending' || model.cell.status === 'pending';
  const failed =
    !onRobes &&
    (model.twin.status === 'failed' || (!model.twin.imageUrl && model.cell.status === 'failed'));
  const chip = reading ? tw.reading : drawing ? tw.drawing : null;
  const pill = 'absolute top-4 rounded-pill border border-hairline bg-bg px-3.5 py-2';
  return (
    <View className="gap-2">
      <View className="h-[440px] overflow-hidden bg-surface-sunk">
        {/* Her shape under the photograph: the ghost until anything is on file. */}
        {onRobes ? null : (
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
        )}
        {image ? (
          <View
            className="absolute inset-0"
            style={{ opacity: drawing && !onRobes && !model.twin.current ? 0.6 : 1 }}
          >
            <Image
              source={image}
              alt={onRobes ? tw.robesModel : copy.imageAlt}
              className="h-full"
            />
          </View>
        ) : onRobes ? (
          <View className="absolute inset-0 items-center justify-center">
            <Icon name="user" size={36} color={faint} />
          </View>
        ) : null}
        <StageFade />
        {onRobes ? (
          <View className={`${pill} left-3.5`}>
            <Text size="caption" className="text-[10px] uppercase" style={{ letterSpacing: 1.6 }}>
              {tw.robesModel}
            </Text>
          </View>
        ) : null}
        {chip ? (
          // The chip on the stage while she is drawn (legacy .mv-photo-busy).
          <View className={`${pill} right-3.5`}>
            <Text
              size="caption"
              className="text-[10px] uppercase"
              accessibilityLiveRegion="polite"
              style={{ letterSpacing: 1.6 }}
            >
              {chip}
            </Text>
          </View>
        ) : null}
        {empty && !reading ? (
          // Nothing on file: the invitation sits in the stage, over the ghost figure.
          <View className="absolute inset-0 items-center justify-center px-[34px]">
            <Text italic size="caption" tone="faint" className="text-center">
              {tw.stageEmpty}
            </Text>
          </View>
        ) : caption ? (
          <Text italic className="absolute right-16 bottom-[18px] left-5">
            {caption}
          </Text>
        ) : null}
        {onRetake ? (
          // Retake (design 3d): a 32pt circle bottom-right, the one way to another selfie.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tw.retake}
            onPress={onRetake}
            hitSlop={8}
            className="absolute items-center justify-center rounded-pill border border-hairline bg-bg"
            style={{ right: 14, bottom: 18, width: 32, height: 32 }}
            testID="twin-retake"
          >
            <Icon name="camera" size={14} color={ink} />
          </Pressable>
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
