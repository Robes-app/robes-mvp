import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { StyleProfile } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { seasonChoices } from '@robes/core/style-dna';
import { Icon } from '@robes/icons/native';
import { EmptyState, Image, MIN_TOUCH, Skeleton, Text, useColor, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { AnalysisCard } from './Style';
import { Section, SkinAndHair, useDrawTwin, useModel, useModelPick } from './twin';

const tw = twin.twinPage;

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
        <View className="flex-row gap-4">
          {model.closeUpUrl ? (
            <View style={{ width: 112 }}>
              <Image source={model.closeUpUrl} alt={tw.closeUpCard} aspect="3:4" />
            </View>
          ) : null}
          <Text size="small" tone="muted" className="flex-1">
            {tw.closeUpHelp}
          </Text>
        </View>
        <AnalysisCard kind="colour" profile={profile} />
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

function Seasons({ profile }: { profile: StyleProfile }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const [more, setMore] = useState(false);
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
      {seasonChoices(colour.season, more).map((s) => {
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
              className={`${row} ${on ? 'border-ink bg-surface' : 'border-hairline'}`}
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
          className={`${row} border-hairline bg-surface`}
        >
          <Text>{tw.anotherSeason}</Text>
          <Icon name="forward" color={muted} size={16} />
        </Pressable>
      )}
    </View>
  );
}
