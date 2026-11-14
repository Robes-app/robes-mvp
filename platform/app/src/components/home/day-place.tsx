'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { DiaryDay, DiaryPlace } from '@robes/contracts';
import { diary } from '@robes/copy';
import { weatherIcon, weatherWord } from '@robes/core/weather';
import { Icon } from '@robes/icons/web';
import { useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { PlacePopover } from './place-popover';

const copy = diary.day;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Where she is on a day, on the day card's eyebrow (design "Diary & Day", 14 Nov): the city, then
// that day's range and sky while the forecast reaches it, on a fine underline with a chevron. A
// tap opens the place search; the place she names decides the weather, and she never sets the
// weather herself. The native twin is mobile/src/features/home/DayPlace.tsx.
export function DayPlace({
  day,
  today,
  home,
}: {
  day: DiaryDay;
  today: string;
  // Her home city: it names the chip on a day with no place of its own.
  home: string | null;
}) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
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
      .catch((err) => toast({ message: errorCopy(err) }));
  };
  return (
    <>
      <button
        type="button"
        aria-label={city ? copy.place(city) : copy.addPlace}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-testid="day-place"
        className={`relative -my-3.5 flex min-h-11 items-center tracking-[inherit] uppercase ${focus}`}
      >
        <span className="inline-flex items-center gap-2 border-accent-warm/55 border-b-[0.5px] pb-[3px]">
          <span>{city ?? copy.addPlace}</span>
          {city && wx ? (
            <>
              <span aria-hidden>·</span>
              <span data-testid="day-weather">{wx.tempRange}</span>
              {icon ? <Icon name={icon} size={14} label={weatherWord(wx)} /> : null}
            </>
          ) : null}
          <Icon name="down" size={10} className="-ml-0.5" />
        </span>
      </button>
      {open ? (
        <div className="absolute top-7 left-0 z-40 w-[300px] max-w-full">
          <PlacePopover
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
        </div>
      ) : null}
    </>
  );
}
