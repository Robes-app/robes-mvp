import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { DiaryDay, DiaryPlace } from '@robes/contracts';
import { diary } from '@robes/copy';
import { weatherIcon, weatherWord } from '@robes/core/weather';
import { Icon } from '@robes/icons/native';
import { FINE_EDGE, MIN_TOUCH, maxFontSizeMultiplier, useColor, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text as RNText, type TextStyle, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { PlaceSheet } from './PlaceSheet';

const copy = diary.day;
// The chip's own height: the hit area makes up the rest of 44.
const LINE = 20;

// Where she is on a day, on the day card's eyebrow (design "Diary & Day", 14 Nov): the city, then
// that day's range and sky while the forecast reaches it, on a fine underline with a chevron. A
// tap opens the place sheet; the place she names decides the weather, and she never sets the
// weather herself. The web twin is app/src/components/home/day-place.tsx.
export function DayPlace({
  day,
  today,
  home,
  textStyle,
}: {
  day: DiaryDay;
  today: string;
  // Her home city: it names the chip on a day with no place of its own.
  home: string | null;
  // The eyebrow's own type, so the chip reads as part of its line.
  textStyle: TextStyle;
}) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const warm = useColor('accent-warm');
  const [open, setOpen] = useState(false);
  const wx = day.weather;
  const icon = weatherIcon(wx?.code);
  const city = day.place?.city ?? wx?.city ?? home;
  const setPlace = (place: DiaryPlace | null) => {
    setOpen(false);
    void api
      .call('plan.place', { params: { date: day.date }, input: { place } })
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.day') }),
          queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') }),
        ]),
      )
      .catch((err) => toast.show({ message: errorMessage(err) }));
  };
  const word = (text: string, testID?: string) => (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier.label}
      className="text-accent-warm uppercase"
      style={textStyle}
      testID={testID}
    >
      {text}
    </RNText>
  );
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[
          city ? copy.place(city) : copy.addPlace,
          city && wx ? `${wx.tempRange}, ${weatherWord(wx)}` : null,
        ]
          .filter(Boolean)
          .join(', ')}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        hitSlop={(MIN_TOUCH - LINE) / 2}
        testID="day-place"
      >
        <View
          className="flex-row items-center gap-2 border-accent-warm/55 pb-[3px]"
          style={{ minHeight: LINE, borderBottomWidth: FINE_EDGE }}
        >
          {word(city ?? copy.addPlace)}
          {city && wx ? (
            <>
              {word('·')}
              {word(wx.tempRange, 'day-weather')}
              {icon ? <Icon name={icon} size={14} color={warm} /> : null}
            </>
          ) : null}
          <Icon name="down" size={10} color={warm} />
        </View>
      </Pressable>
      <PlaceSheet
        open={open}
        date={day.date}
        today={today}
        home={
          home
            ? {
                city: home,
                weather: !day.place && wx ? { tempRange: wx.tempRange, code: wx.code } : null,
              }
            : null
        }
        current={city}
        onPick={(place) => setPlace(place)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
