import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { StyleProfile } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { seasonChoices } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/native';
import {
  Button,
  EmptyState,
  ErrorText,
  Image,
  MIN_TOUCH,
  Progress,
  Sheet,
  Skeleton,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { ColourResult, useAnalyse } from './Style';
import { Section, SkinAndHair, useDrawTwin, useModel, useModelPick } from './twin';

const tw = twin.twinPage;
const style = you.style;

// Colouring (legacy redline 3b): the close-up, her season (the live twelve-season picker) and
// skin and hair as overrides on what the close-up shows. Leaving redraws her twin.
export function Colouring() {
  const query = useModel();
  const style = useApi('me.style.get');
  const { pick } = useModelPick();
  useDrawTwin('leave');
  if (query.isError) return <EmptyState title={errorMessage(query.error)} />;
  const model = query.data;
  const profile = style.data;
  if (!model || !profile) return <Skeleton width="100%" height={240} />;
  return (
    <ScrollView contentContainerClassName="gap-5 px-6 pb-12" keyboardShouldPersistTaps="handled">
      <Section title={tw.closeUpCard}>
        <CloseUp url={model.closeUpUrl} />
      </Section>
      <Section title={tw.season}>
        <Seasons profile={profile} />
      </Section>
      <Section title={tw.skinAndHair}>
        <Text size="small" tone="muted">
          {model.closeUpUrl ? tw.skinAndHairRead : tw.skinAndHairHand}
        </Text>
        <SkinAndHair model={model} pick={pick} />
      </Section>
    </ScrollView>
  );
}

// Twin of web you/model/colouring/colouring-view.tsx CloseUp (redline 27 Oct): the photo
// 112 × 150 with the re-take as a 32pt circle on it; before one, a dashed slot and the screen's one
// commitment. The colour result lives behind "Full colour notes", never in this card.
function CloseUp({ url }: { url: string | null }) {
  const { start, busy, reading, noSubject } = useAnalyse('colour');
  const ink = useColor('ink');
  return (
    <View className="gap-3">
      <View className="flex-row items-start gap-4">
        {url ? (
          <View style={{ width: 112, height: 150 }}>
            <View className="overflow-hidden rounded-lg" style={{ width: 112, height: 150 }}>
              <Image source={url} alt={tw.closeUpCard} aspect="3:4" />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={style.retake}
              disabled={busy || reading}
              onPress={() => void start()}
              hitSlop={6}
              className="absolute items-center justify-center rounded-pill bg-bg"
              style={{ left: 6, bottom: 6, width: 32, height: 32 }}
            >
              <Icon name="swap" size={14} color={ink} />
            </Pressable>
          </View>
        ) : (
          <View
            className="items-center justify-center rounded-lg border border-border-control border-dashed bg-surface-sunk"
            style={{ width: 112, height: 150 }}
          >
            <Text italic size="caption" tone="faint">
              {tw.closeUpCard}
            </Text>
          </View>
        )}
        <View className="flex-1 gap-3">
          <Text size="small" tone="muted">
            {tw.closeUpHelp}
          </Text>
          {url ? null : (
            <Button
              className="self-start"
              loading={busy || reading}
              loadingLabel={style.colour.reading}
              onPress={() => void start()}
            >
              {style.choosePhoto}
            </Button>
          )}
        </View>
      </View>
      {url && reading ? <Progress stage={style.colour.reading} /> : null}
      {noSubject ? <ErrorText>{style.colour.noSubject}</ErrorText> : null}
    </View>
  );
}

function Seasons({ profile }: { profile: StyleProfile }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const [more, setMore] = useState(false);
  const [notes, setNotes] = useState(false);
  const season = useApiMutation('me.style.season', {
    onSuccess: (data) => queryClient.setQueryData(queryKeys.call('me.style.get'), data),
    onError: () => toast.show({ message: tw.seasonFailed }),
  });
  const colour = profile.colour;
  if (!colour) {
    return (
      <Text size="small" tone="muted">
        {tw.addSeason}
      </Text>
    );
  }
  const row = 'flex-row items-center justify-between rounded-crisp border px-4';
  return (
    <View className="gap-2">
      {seasonChoices(colour.read_season ?? colour.season, more).map((s) => {
        const on = s === colour.season;
        return (
          <View key={s} className="gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={s}
              accessibilityState={{ selected: on, disabled: season.isPending }}
              disabled={season.isPending}
              onPress={() => (on ? null : season.mutate({ input: { season: s } }))}
              style={{ minHeight: Math.max(MIN_TOUCH, 60) }}
              className={`${row} ${on ? 'border-selected-line bg-selected' : 'border-hairline'}`}
            >
              <Text className="font-display text-xl">{s}</Text>
              {on ? <Icon name="check" color={ink} size={16} /> : null}
            </Pressable>
            {on ? (
              <View className="gap-3 px-1">
                <View className="flex-row gap-1" accessible={false}>
                  {colour.palette.slice(0, 9).map((hex) => (
                    // Palette colours are catalog data, the one place colour comes inline.
                    <View
                      key={hex}
                      className="h-6 flex-1 rounded-crisp"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </View>
                <Text italic tone="faint" className="font-display text-lg">
                  {tw.seasonSummary(
                    [colour.undertone, colour.contrast].filter(Boolean).join(' · '),
                    colour.summary,
                  )}
                </Text>
                <Button variant="quiet" className="self-start" onPress={() => setNotes(true)}>
                  {tw.colourNotes}
                </Button>
              </View>
            ) : null}
          </View>
        );
      })}
      {more ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tw.anotherSeason}
          onPress={() => setMore(true)}
          style={{ minHeight: Math.max(MIN_TOUCH, 60) }}
          className={`${row} border-hairline bg-surface-raised`}
        >
          <Text className="font-display text-xl">{tw.anotherSeason}</Text>
          <Icon name="forward" color={muted} size={16} />
        </Pressable>
      )}
      {/* The colour notes sheet (4b): Wear, Go easy on and Metals live here, never inline. */}
      <Sheet open={notes} onClose={() => setNotes(false)} title={tw.colourNotes} closeButton>
        <ScrollView style={{ flexShrink: 1 }} contentContainerClassName="pb-6">
          <ColourResult colour={colour} />
        </ScrollView>
      </Sheet>
    </View>
  );
}
