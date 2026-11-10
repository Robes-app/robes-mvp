import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { StyleProfile } from '@robes/contracts';
import { twin } from '@robes/copy';
import { seasonChoices } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/native';
import {
  Button,
  EmptyState,
  MIN_TOUCH,
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
import { ColourResult } from './Style';
import { Section, SkinAndHair, useDrawTwin, useModel, useModelPick } from './twin';
import { useSelfie } from './use-selfie';

const tw = twin.twinPage;

// Colouring (legacy redline 3b; plan 2026-11-05 §1.6): her season (the live twelve-season picker)
// and skin and hair as overrides on what her selfie read. The selfie itself is taken a screen
// earlier (the camera is the one door), so no close-up card here. Leaving redraws her twin.
// Web twin: app/(app)/you/model/colouring/colouring-view.tsx.
export function Colouring() {
  const query = useModel();
  const style = useApi('me.style.get');
  const { pick } = useModelPick();
  const selfie = useSelfie();
  useDrawTwin('leave');
  if (query.isError) return <EmptyState title={errorMessage(query.error)} />;
  const model = query.data;
  const profile = style.data;
  if (!model || !profile) return <Skeleton width="100%" height={240} />;
  return (
    <ScrollView contentContainerClassName="gap-5 px-6 pb-12" keyboardShouldPersistTaps="handled">
      <Section title={tw.season}>
        <Seasons profile={profile} onSelfie={selfie.start} />
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

function Seasons({ profile, onSelfie }: { profile: StyleProfile; onSelfie: () => void }) {
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
    // No read yet (a twin shaped by hand): the camera is still the one way to a season.
    return (
      <View className="gap-3">
        <Text size="small" tone="muted">
          {tw.addSeason}
        </Text>
        <Button variant="quiet" className="self-start" onPress={onSelfie}>
          {tw.addSelfie}
        </Button>
      </View>
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
      {/* Another season opens the rest (3f), then reads Fewer seasons. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={more ? tw.fewerSeasons : tw.anotherSeason}
        accessibilityState={{ expanded: more }}
        onPress={() => setMore((m) => !m)}
        style={{ minHeight: Math.max(MIN_TOUCH, 60) }}
        className={`${row} border-hairline bg-surface-raised`}
      >
        <Text className="font-display text-xl">{more ? tw.fewerSeasons : tw.anotherSeason}</Text>
        <View style={more ? { transform: [{ rotate: '180deg' }] } : undefined}>
          <Icon name={more ? 'down' : 'forward'} color={muted} size={16} />
        </View>
      </Pressable>
      {/* The colour notes sheet (4b): Wear, Go easy on and Metals live here, never inline. */}
      <Sheet open={notes} onClose={() => setNotes(false)} title={tw.colourNotes} closeButton>
        <ScrollView style={{ flexShrink: 1 }} contentContainerClassName="pb-6">
          <ColourResult colour={colour} />
        </ScrollView>
      </Sheet>
    </View>
  );
}
