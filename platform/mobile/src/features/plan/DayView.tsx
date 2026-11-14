import { queryKeys, useApi } from '@robes/api-client/react';
import type { DayCard as DayCardData } from '@robes/contracts';
import { diary as copy } from '@robes/copy';
import { longDate } from '@robes/core/calendar';
import {
  ErrorText,
  fonts,
  InlineTitleField,
  maxFontSizeMultiplier,
  Skeleton,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, Text as RNText, ScrollView, View } from 'react-native';
import { DayCard } from '@/features/home/DayCard';
import { DayPlace } from '@/features/home/DayPlace';
import { PHOTO_RATIO } from '@/features/home/diary';
import { errorMessage } from '@/lib/errors';
import { usePullRefresh } from '@/lib/pull-refresh';
import { useNameDay } from './plan';

// The eyebrow's type (design "Diary & Day": 10pt caps at 0.2em in the warm accent).
const EYEBROW = { fontFamily: fonts.sansRegular, fontSize: 10, letterSpacing: 2 } as const;

// The day's cache with one look taken off it (optimistic; the server read follows).
function withoutEntry(id: string) {
  return (old: DayCardData | undefined): DayCardData | undefined =>
    old && { ...old, day: { ...old.day, entries: old.day.entries.filter((e) => e.id !== id) } };
}

// The day screen (design "Diary & Day", 14 Nov): the date and where she is that day on one
// eyebrow, her name for the day as a standing field, then the day exactly as Home draws it —
// `DayCard`, its looks with Swap · Edit and her model with Capture · Create · Pick. Web twin:
// app/src/app/(app)/plan/[date]/day-view.tsx.
export function DayView({ date }: { date: string }) {
  const queryClient = useQueryClient();
  const query = useApi(
    'plan.day',
    { params: { date } },
    {
      // The draft Robes is making for the day (plan 2026-11-03): read every 2 s.
      refetchInterval: (q) => {
        const draft = q.state.data?.day.draft;
        return draft?.jobId || draft?.look?.framePending ? 2_000 : false;
      },
    },
  );
  const pull = usePullRefresh(query.refetch);
  // Back from a sheet over the day (Create, Edit, the camera) the day is read again.
  const { refetch } = query;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );
  const nameDay = useNameDay();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.day') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
  };

  const card = query.data;
  const day = card?.day;
  const words = day?.name ?? day?.entries.find((e) => e.activity?.trim())?.activity?.trim() ?? '';

  return (
    <ScrollView
      contentContainerClassName="gap-6 px-5 pt-3 pb-12"
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl {...pull} />}
      testID="day-page"
    >
      <View className="gap-2">
        <View className="flex-row flex-wrap items-center gap-2">
          <RNText
            accessibilityRole="header"
            maxFontSizeMultiplier={maxFontSizeMultiplier.label}
            className="text-accent-warm uppercase"
            style={EYEBROW}
          >
            {longDate(date)}
          </RNText>
          {card && day ? (
            <>
              <RNText
                accessibilityElementsHidden
                importantForAccessibility="no"
                className="text-accent-warm"
                style={EYEBROW}
              >
                ·
              </RNText>
              <DayPlace day={day} today={card.today} home={card.home} textStyle={EYEBROW} />
            </>
          ) : null}
        </View>
        {/* Any day can be named, so she can plan a week before adding outfits. Keyed by her
            name for the day, so the field follows what the server holds. */}
        <View className="flex-row">
          <InlineTitleField
            key={words}
            value={words}
            label={copy.day.name}
            placeholder={copy.day.name}
            size={24}
            autoFocus={false}
            bare
            onCommit={(value) => {
              if (value !== words) {
                nameDay.mutate({ params: { date }, input: { name: value || null } });
              }
            }}
            testID="day-name"
          />
        </View>
      </View>

      {query.isError ? <ErrorText>{errorMessage(query.error)}</ErrorText> : null}
      {card && day ? (
        <DayCard
          day={day}
          today={card.today}
          forget={(id) =>
            queryClient.setQueryData(
              queryKeys.call('plan.day', { params: { date } }),
              withoutEntry(id),
            )
          }
          refresh={refresh}
        />
      ) : query.isPending ? (
        <View accessibilityState={{ busy: true }}>
          <Skeleton width="100%" aspectRatio={1 / PHOTO_RATIO} />
        </View>
      ) : null}
    </ScrollView>
  );
}
