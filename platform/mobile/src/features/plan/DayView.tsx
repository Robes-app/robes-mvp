import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { diary as copy, plan } from '@robes/copy';
import { longDate } from '@robes/core/calendar';
import { WEATHER_STALE_MS, weatherWord } from '@robes/core/weather';
import { Icon } from '@robes/icons/native';
import {
  ErrorText,
  Eyebrow,
  fonts,
  IconButton,
  InlineTitleField,
  maxFontSizeMultiplier,
  MIN_TOUCH,
  Skeleton,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text as RNText, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { LookTile } from '../looks/LookTile';
import { localDate } from '../looks/saved-looks';
import { LookPicker } from './LookPicker';
import { useNameDay, usePlanDay, useUnpin } from './plan';

// A look on the day: ★ marks the OOTD (position 0, the one that leads home); ☆ on the others
// makes them it; × takes a look off the day. Web twin: day-view.tsx DayLook.
function DayLook({
  entry,
  hero,
  n,
  onStar,
  onRemove,
}: {
  entry: PlanEntry;
  hero: boolean;
  n: number;
  onStar: () => void;
  onRemove: () => void;
}) {
  const router = useRouter();
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const star = 30;
  return (
    <LookTile
      look={entry.look}
      onPress={() => router.push(`/look/${entry.look.id}`)}
      eyebrow={hero ? copy.day.ootd : copy.day.look(n)}
      eyebrowTone={hero ? 'warm' : 'faint'}
      selected={hero}
      {...(hero ? { testID: 'day-ootd' } : {})}
      onImage={
        hero ? (
          <View
            accessible
            accessibilityLabel={copy.day.isOotd}
            style={{ width: star, height: star }}
            className="absolute top-2 left-2 items-center justify-center rounded-pill border border-selected-line bg-selected"
          >
            <Icon name="star" size={14} color={ink} />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.day.makeOotd(entry.look.name)}
            onPress={onStar}
            hitSlop={(MIN_TOUCH - star) / 2}
            style={{ width: star, height: star }}
            className="absolute top-2 left-2 items-center justify-center rounded-pill border border-rule-mid bg-surface-raised/95"
          >
            <Icon name="star" size={14} color={muted} />
          </Pressable>
        )
      }
      corner={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.day.takeOff(entry.look.name)}
          onPress={onRemove}
          hitSlop={(MIN_TOUCH - 28) / 2}
          style={{ width: 28, height: 28 }}
          className="items-center justify-center rounded-pill border border-rule-mid bg-surface-raised"
        >
          <Icon name="close" size={13} color={muted} />
        </Pressable>
      }
    />
  );
}

// The day page (Front Door design 3k, plan 2026-11-02 §1.10): the date as a rose eyebrow, her
// name for the day, the day's weather, then every look on it — the OOTD starred, the others a
// tap from leading — with × to take one off and a dashed door to add more. Web twin:
// app/src/app/(app)/plan/[date]/day-view.tsx.
export function DayView({ date }: { date: string }) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const ink = useColor('ink');
  const today = localDate();
  const query = usePlanDay(date);
  // The day's range and conditions, for a day gone by too (plan 2026-11-02 B3).
  const weather = useApi('today.weather', { input: { date } }, { staleTime: WEATHER_STALE_MS });
  const wx = weather.data;
  const nameDay = useNameDay();
  const unpin = useUnpin();
  const [picking, setPicking] = useState(false);
  const [naming, setNaming] = useState(false);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
  };
  const star = useApiMutation('plan.ootd', {
    onSuccess: refresh,
    onError: (err) => toast.show({ message: errorMessage(err) }),
  });

  const entries: PlanEntry[] = query.data?.days[0]?.entries ?? [];
  const dayName = query.data?.days[0]?.name ?? null;
  const words = dayName ?? entries.find((e) => e.activity?.trim())?.activity?.trim() ?? '';
  // The day's title is hers (beta): never borrowed from the one look on it.
  const title = words || null;

  function commit(value: string) {
    setNaming(false);
    const next = value || null;
    if ((next ?? '') === words) return;
    nameDay.mutate({ params: { date }, input: { name: next } });
  }

  // A wear is the record (immutable): a worn look leaves the day through its wear, not a pin.
  const remove = (entry: PlanEntry) => {
    if (entry.worn) {
      void api
        .call('looks.unwear', { params: { id: entry.look.id, date } })
        .then(refresh)
        .catch((err) => toast.show({ message: errorMessage(err) }));
      return;
    }
    unpin.mutate({ params: { id: entry.id } });
  };

  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12" testID="day-page">
      <View className="gap-2.5">
        <Eyebrow className="text-accent-warm">{longDate(date)}</Eyebrow>
        <View className="flex-row items-center gap-2">
          {naming ? (
            <InlineTitleField
              value={words}
              label={copy.day.name}
              placeholder={copy.day.name}
              size={26}
              italic
              weight="regular"
              onCommit={commit}
              onCancel={() => setNaming(false)}
            />
          ) : (
            <Text
              accessibilityRole="header"
              className={`flex-1 ${title ? 'text-ink' : 'text-ink-faint'}`}
              style={{ fontFamily: fonts.displayRegularItalic, fontSize: 26, lineHeight: 30 }}
            >
              {title ?? copy.day.name}
            </Text>
          )}
          {/* Any day can be named, so she can plan a week before adding outfits. */}
          {!naming ? (
            <IconButton
              framed
              icon="pencil"
              tone="ink-muted"
              label={title ? plan.day.rename : copy.day.name}
              onPress={() => setNaming(true)}
            />
          ) : null}
        </View>
        {wx ? (
          <RNText
            maxFontSizeMultiplier={maxFontSizeMultiplier.label}
            className="text-ink-muted"
            style={{ fontFamily: fonts.sans, fontSize: 11.5 }}
            testID="day-weather"
          >
            {copy.day.weather(wx.city, weatherWord(wx), wx.tempRange)}
          </RNText>
        ) : null}
      </View>

      <View className="flex-row items-baseline justify-between border-hairline border-b pb-2.5">
        <RNText
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className="text-ink-muted uppercase"
          style={{ fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.8 }}
        >
          {copy.day.looksFor}
        </RNText>
        <RNText
          maxFontSizeMultiplier={maxFontSizeMultiplier.label}
          className="text-ink-faint"
          style={{ fontFamily: fonts.sans, fontSize: 11 }}
        >
          {copy.day.count(entries.length)}
        </RNText>
      </View>

      {query.isError ? <ErrorText>{errorMessage(query.error)}</ErrorText> : null}
      {query.isPending ? (
        <View className="flex-row justify-between" accessibilityState={{ busy: true }}>
          <Skeleton width="48.4%" aspectRatio={4 / 5} />
          <Skeleton width="48.4%" aspectRatio={4 / 5} />
        </View>
      ) : (
        <View className="flex-row flex-wrap justify-between gap-y-2.5">
          {entries.map((entry, i) => (
            <View key={entry.id} style={{ width: '48.4%' }}>
              <DayLook
                entry={entry}
                hero={i === 0}
                n={i + 1}
                onStar={() => star.mutate({ params: { date }, input: { entryId: entry.id } })}
                onRemove={() => remove(entry)}
              />
            </View>
          ))}
          {/* The dashed door to the drawer: beside the looks as tall as a card; alone, a floor. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.day.add}
            onPress={() => setPicking(true)}
            testID="day-add"
            style={entries.length ? { width: '48.4%', aspectRatio: 4 / 5 } : { width: '100%', minHeight: 160 }}
            className="items-center justify-center gap-1.5 rounded-[3px] border border-dashed border-selected-line bg-surface"
          >
            <Icon name="plus" size={20} color={ink} />
            <RNText
              maxFontSizeMultiplier={maxFontSizeMultiplier.label}
              className="text-ink uppercase"
              style={{ fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.8 }}
            >
              {copy.day.add}
            </RNText>
          </Pressable>
        </View>
      )}
      <LookPicker
        date={picking ? date : null}
        today={today}
        mode="add"
        onClose={() => setPicking(false)}
        onChanged={refresh}
      />
    </ScrollView>
  );
}
