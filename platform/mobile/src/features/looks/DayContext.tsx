import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { DiaryPlace } from '@robes/contracts';
import { diary } from '@robes/copy';
import { shortRange, WEATHER_STALE_MS, weatherIcon } from '@robes/core/weather';
import { Icon } from '@robes/icons/native';
import { fonts, useColor, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import { PlaceSheet } from '@/features/home/PlaceSheet';
import { errorMessage } from '@/lib/errors';

const copy = diary.door;
// The chips stand 28pt (design 3k); a tap reaches them from 8pt either side (44pt).
const CHIP_SLOP = { top: 8, bottom: 8 };
const chip = 'min-h-7 flex-row items-center gap-1.5 self-start rounded-pill border px-2.5';
// The Front Door's weather chip (PRD rev 3 §4.6): the deep rose fill with a cream label; out, an
// outline chip on the warm line offers it back.
const warm = `${chip} border-accent-warm bg-accent-warm`;
const quiet = `${chip} border-warm-line bg-transparent`;

function ChipText({ children, onRose = false }: { children: string; onRose?: boolean }) {
  return (
    <RNText
      className={`text-[11px] ${onRose ? 'text-surface-raised' : 'text-ink'}`}
      style={{ fontFamily: fonts.sans }}
      numberOfLines={1}
    >
      {children}
    </RNText>
  );
}

// The day's context in the draft sheet (Front Door PRD rev 3 §4.6: "📍 Dublin · ☁ 9–13° ×" in
// rose): where she is that day and its range. The place decides the weather (root CLAUDE.md), so
// tapping the pin opens the place sheet; × leaves the weather out of this draft's brief, and the
// outline "Add location & weather" brings it back. Moved here from Home's prompt box (D22). Web
// twin: app/src/components/looks/day-context.tsx.
export function DayContext({
  date,
  weatherOff,
  onWeatherOff,
}: {
  date: string;
  weatherOff: boolean;
  onWeatherOff: (off: boolean) => void;
}) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const ink = useColor('ink');
  const onRose = useColor('surface-raised');
  const today = useApi('today.get');
  const weather = useApi('today.weather', undefined, {
    staleTime: WEATHER_STALE_MS,
    refetchOnWindowFocus: false,
  });
  const [open, setOpen] = useState(false);
  const day = today.data?.diary?.days.find((x) => x.date === date);
  if (!today.data || !day) return null;
  // Her home with the day's weather when she is home; else today's reading names the city.
  const home =
    !day.place && day.weather?.city
      ? {
          city: day.weather.city,
          weather: { tempRange: day.weather.tempRange, code: day.weather.code },
        }
      : weather.data?.city
        ? { city: weather.data.city, weather: null }
        : null;
  const city = day.place?.city ?? home?.city ?? null;
  const wx = day.weather;
  const icon = weatherIcon(wx?.code);
  const setPlace = (place: DiaryPlace | null) => {
    setOpen(false);
    void api
      .call('plan.place', { params: { date }, input: { place } })
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') }))
      .catch((err) => toast.show({ message: errorMessage(err) }));
  };
  return (
    <View testID="draft-context">
      {weatherOff ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.weatherBack}
          onPress={() => onWeatherOff(false)}
          hitSlop={CHIP_SLOP}
          className={quiet}
          testID="weather-chip"
        >
          <Icon name="pin" size={11} color={ink} />
          <ChipText>{copy.weather}</ChipText>
        </Pressable>
      ) : city ? (
        <View className={`${warm} pr-0`} testID="place-chip">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.changePlace}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((o) => !o)}
            hitSlop={CHIP_SLOP}
            className="h-full flex-row items-center gap-1.5 rounded-pill"
          >
            <Icon name="pin" size={11} color={onRose} />
            <ChipText onRose>{city}</ChipText>
            {wx ? (
              <>
                <RNText className="text-[11px] text-surface-raised" style={{ opacity: 0.7 }}>
                  ·
                </RNText>
                {icon ? <Icon name={icon} size={11} color={onRose} /> : null}
                <ChipText onRose>{shortRange(wx.tempRange)}</ChipText>
              </>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.weatherOut}
            onPress={() => onWeatherOff(true)}
            hitSlop={{ top: 12, bottom: 12, left: 4, right: 8 }}
            className="size-5 items-center justify-center rounded-pill"
          >
            <Icon name="close" size={11} color={onRose} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={diary.place.search}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
          hitSlop={CHIP_SLOP}
          className={quiet}
          testID="place-chip"
        >
          <Icon name="pin" size={11} color={ink} />
          <ChipText>{diary.place.search}</ChipText>
        </Pressable>
      )}
      <PlaceSheet
        open={open}
        date={date}
        today={today.data.date}
        home={home}
        current={city}
        onPick={(place) => setPlace(place)}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}
