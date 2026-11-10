import { queryKeys, useApi } from '@robes/api-client/react';
import type { Facts, Model as ModelData } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { chosenTones } from '@robes/core/avatar';
import { Icon } from '@robes/icons/native';
import { shadowNative } from '@robes/tokens';
import {
  appCaps,
  EmptyState,
  ErrorText,
  fonts,
  MIN_TOUCH,
  maxFontSizeMultiplier,
  Skeleton,
  Text,
  useColor,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, Text as RNText, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScanLine } from '@/features/looks/ScanLine';
import { errorMessage } from '@/lib/errors';
import { SettingsGroup, SettingsRow } from './Settings';
import {
  Figure,
  Lineup,
  lineSummary,
  type TwinRead,
  twinRead,
  useDrawTwin,
  useHeldWhile,
  useModel,
  useModelPick,
  useTwinStatus,
} from './twin';
import { useSelfie, useSelfieRead } from './use-selfie';

const copy = you.model;
const tw = twin.twinPage;
const HERO = 520;
// Her picture while she waits for her twin, and the space above her head under the status bar.
const DIMMED = 0.45;
const HEADROOM = 16;

// You › Your digital twin (legacy 2026-10-20 redline 3a; plan 2026-11-05 §1.4–1.5; redlines
// R1–R11, R15–R18 of 2026-11-05). On a Robes model (3c): its portrait as the hero, Add a selfie
// as the one commitment, then one card holding the lineup and the two doors (closed: Colouring
// and Body shape are the twin's). On her own twin (3d): the twin with its redraw control, the
// doors, and the lineup with her first. Web twin: app/src/app/(app)/you/model/model-view.tsx.
export function Model() {
  const router = useRouter();
  const query = useModel();
  const style = useApi('me.style.get');
  const dna = useApi('me.dna.get');
  const queryClient = useQueryClient();
  const { pick, pending } = useModelPick();
  const selfie = useSelfie();
  const read = useSelfieRead();
  const muted = useColor('ink-muted');
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
    return <Skeleton width="100%" height={HERO} className="rounded-none" />;
  const onRobes = model.stand?.on === 'robes';
  const colour = style.data.colour;
  const line = lineSummary(dna.data.facts);
  const drewHer = twinRead(model, dna.data.facts);
  const error = read.error;
  const doors = (
    <>
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
    </>
  );
  return (
    // The hero is full-bleed under the status bar (R1); the gutter belongs to what sits under it.
    <ScrollView contentContainerClassName="pb-12">
      <Stage
        model={model}
        facts={dna.data.facts}
        read={drewHer}
        reading={read.reading}
        onRetake={onRobes ? undefined : selfie.start}
      />
      <View className="gap-5 px-6 pt-3">
        {error ? <ErrorText>{error}</ErrorText> : null}
        {onRobes ? (
          <>
            {/* R9: the one commitment, a dashed warm row 12pt under the picture. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${tw.addSelfie}, ${tw.addSelfieSub}`}
              onPress={selfie.start}
              className="min-h-[62px] flex-row items-center gap-3.5 rounded-soft border border-warm-line px-4 py-3"
              style={{ borderStyle: 'dashed' }}
              testID="twin-add-selfie"
            >
              <Icon name="camera" size={20} color={muted} />
              <View className="flex-1 gap-1">
                <Text style={{ fontFamily: fonts.displayRegular, fontSize: 18 }}>
                  {tw.addSelfie}
                </Text>
                <Text size="caption" tone="muted">
                  {tw.addSelfieSub}
                </Text>
              </View>
              <Icon name="forward" size={16} color={muted} />
            </Pressable>
            {/* R10: one card — the lineup over a hairline, then the doors, which stand closed on a
                Robes model (Colouring and Body shape are the twin's). */}
            <SettingsGroup>
              <View className="border-hairline border-b p-4">
                <Lineup model={model} pick={pick} pending={pending} />
              </View>
              <View
                accessibilityState={{ disabled: true }}
                style={{ opacity: 0.5 }}
                pointerEvents="none"
              >
                {doors}
              </View>
            </SettingsGroup>
          </>
        ) : (
          <>
            <SettingsGroup title={tw.readFrom}>{doors}</SettingsGroup>
            <Lineup model={model} pick={pick} pending={pending} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

// The hero (redlines R3–R5): 520pt tall, full width, the picture covering it — a Robes model held
// at 50% 30%, her twin centred — and a hard edge to the ground beneath. On a Robes model, its tag
// sits bottom-left (R8); on her own, the redraw control bottom-right (R15) and her colour words
// as the caption (R16).
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
  const chip = useTwinStatus(reading, drawing);
  const insets = useSafeAreaInsets();
  // One wait from Use photo to her twin (Annie, 10 Nov): the picture she had stays, dimmed under
  // the scan, until her twin lands; the caption goes quiet while the status speaks.
  const busy = reading || drawing;
  const shown = useHeldWhile({ image, onRobes }, busy);
  const caps = (text: string) => (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier.label}
      className="text-ink uppercase"
      style={appCaps}
    >
      {text}
    </RNText>
  );
  return (
    <View className="gap-2">
      <View className="overflow-hidden bg-surface-sunk" style={{ height: HERO }}>
        {/* Her shape under the photograph: the ghost until anything is on file. */}
        {shown.onRobes ? null : (
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
        {shown.image && shown.onRobes ? (
          <ExpoImage
            source={{ uri: shown.image }}
            contentFit="cover"
            contentPosition={{ top: '30%', left: '50%' }}
            accessibilityLabel={tw.robesModel}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: busy ? DIMMED : 1,
            }}
          />
        ) : shown.image ? (
          <View className="absolute inset-0" style={{ opacity: busy ? DIMMED : 1 }}>
            {/* Her picture starts under the status bar, its own studio blurred behind it, so her
                head never sits against the top of the screen. */}
            <ExpoImage
              source={{ uri: shown.image }}
              contentFit="cover"
              blurRadius={24}
              accessible={false}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <ExpoImage
              source={{ uri: shown.image }}
              contentFit="cover"
              contentPosition="top"
              accessibilityLabel={copy.imageAlt}
              style={{
                position: 'absolute',
                top: insets.top + HEADROOM,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          </View>
        ) : shown.onRobes ? (
          <View className="absolute inset-0 items-center justify-center">
            <Icon name="user" size={36} color={faint} />
          </View>
        ) : null}
        {shown.onRobes ? (
          // R8: the tag, bottom-left, on glass.
          <View
            className="absolute bottom-4 left-4 h-7 flex-row items-center gap-2 rounded-pill bg-veil px-3"
            testID="twin-robes-tag"
          >
            <View className="size-1.5 rounded-pill bg-ink-faint" />
            {caps(tw.robesModel)}
          </View>
        ) : null}
        {busy ? <ScanLine /> : null}
        {chip ? (
          // The status on the stage while she is read and drawn (designs 06–07): a dot and one
          // line, level with the back disc.
          <View
            className="absolute right-3.5 h-8 flex-row items-center gap-2.5 rounded-pill bg-veil px-3.5"
            style={{ top: insets.top + 20 }}
            accessibilityLiveRegion="polite"
            testID="twin-status"
          >
            <View className="size-1.5 rounded-pill bg-accent-warm" />
            {caps(chip)}
          </View>
        ) : null}
        {empty && !busy ? (
          // Nothing on file: the invitation sits in the stage, over the ghost figure.
          <View className="absolute inset-0 items-center justify-center px-[34px]">
            <Text italic size="caption" tone="faint" className="text-center">
              {tw.stageEmpty}
            </Text>
          </View>
        ) : caption && !busy ? (
          // R16: Cormorant italic 300 at 20, 18pt from the left and the bottom.
          <RNText
            maxFontSizeMultiplier={maxFontSizeMultiplier.body}
            className="absolute right-16 bottom-[18px] left-[18px] text-ink"
            style={{ fontFamily: fonts.displayItalic, fontSize: 20, lineHeight: 27 }}
          >
            {caption}
          </RNText>
        ) : null}
        {onRetake ? (
          // R15: the redraw control — 44pt of glass with a lift, 14pt from the bottom-right.
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tw.retake}
            onPress={onRetake}
            className="absolute items-center justify-center rounded-pill bg-veil"
            style={[
              { right: 14, bottom: 14, width: MIN_TOUCH, height: MIN_TOUCH },
              shadowNative.float,
            ]}
            testID="twin-retake"
          >
            <Icon name="refresh" size={18} color={ink} />
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
