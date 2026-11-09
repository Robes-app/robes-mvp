'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { DiaryPlace } from '@robes/contracts';
import { diary } from '@robes/copy';
import { shortRange, weatherIcon } from '@robes/core/weather';
import { Icon } from '@robes/icons/web';
import { useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PlacePopover } from '@/components/home/place-popover';
import { errorCopy } from '@/lib/error-copy';

const copy = diary.door;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const chip =
  'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 font-sans text-[11px]';
// The Front Door's weather chip (PRD rev 3 §4.6): the deep rose fill with a cream label; out, an
// outline chip on the warm line offers it back.
const warm = `${chip} border-accent-warm bg-accent-warm text-surface-raised`;
const quiet = `${chip} border-warm-line bg-transparent text-ink`;
const WEATHER_STALE_MS = 15 * 60_000;

// The day's context in the draft drawer (Front Door PRD rev 3 §4.6: "📍 Dublin · ☁ 9–13° ×" in
// rose): where she is that day and its range. The place decides the weather (root CLAUDE.md), so
// tapping the pin opens the place search; × leaves the weather out of this draft's brief, and the
// outline "Add location & weather" brings it back. Moved here from Home's prompt box (D22). The
// native twin is mobile/src/features/looks/DayContext.tsx.
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
      .catch((err) => toast({ message: errorCopy(err) }));
  };
  return (
    <div className="flex flex-col gap-1.5" data-testid="draft-context">
      {weatherOff ? (
        <button
          type="button"
          onClick={() => onWeatherOff(false)}
          aria-label={copy.weatherBack}
          data-testid="weather-chip"
          data-state="off"
          className={`${quiet} self-start ${focus}`}
        >
          <Icon name="pin" size={11} />
          {copy.weather}
        </button>
      ) : city ? (
        <span className={`${warm} self-start pr-0`} data-testid="place-chip">
          <button
            type="button"
            aria-label={copy.changePlace}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={`flex h-full items-center gap-1.5 rounded-pill ${focus}`}
          >
            <Icon name="pin" size={11} className="shrink-0" />
            {city}
            {wx ? (
              <>
                <span aria-hidden className="text-surface-raised/70">
                  ·
                </span>
                {icon ? <Icon name={icon} size={11} /> : null}
                {shortRange(wx.tempRange)}
              </>
            ) : null}
          </button>
          <button
            type="button"
            aria-label={copy.weatherOut}
            title={copy.weatherOut}
            onClick={() => onWeatherOff(true)}
            className={`flex size-5 items-center justify-center rounded-pill text-surface-raised ${focus}`}
          >
            <Icon name="close" size={11} />
          </button>
        </span>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          data-testid="place-chip"
          className={`${quiet} self-start ${focus}`}
        >
          <Icon name="pin" size={11} />
          {diary.place.search}
        </button>
      )}
      {open ? (
        <PlacePopover
          date={date}
          today={today.data.date}
          home={home}
          current={city}
          onPick={(place) => setPlace(place)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
