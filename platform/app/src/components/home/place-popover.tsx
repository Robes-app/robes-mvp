'use client';

import { useApi } from '@robes/api-client/react';
import type { DiaryPlace, PlaceHit } from '@robes/contracts';
import { diary } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { shortRange, weatherIcon } from '@robes/core/weather';
import { Icon } from '@robes/icons/web';
import { useEffect, useRef, useState } from 'react';

const copy = diary.place;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The places she picked lately, newest first, kept for the session (design 3k's "Home and recent").
const recent: PlaceHit[] = [];
export function rememberPlace(hit: PlaceHit): void {
  const i = recent.findIndex((r) => r.city === hit.city && r.country === hit.country);
  if (i >= 0) recent.splice(i, 1);
  recent.unshift(hit);
  recent.splice(3);
}
export function recentPlaces(): readonly PlaceHit[] {
  return recent;
}

export interface HomePlace {
  city: string;
  weather: PlaceHit['weather'];
}

// The place popover (design 3k, plan §1.8): under the chips, a search for a city, "For today only",
// then Home and recent — or the cities found as she types, each with the day's range. Enter picks
// the first; Escape closes. The native twin is mobile/src/features/home/PlaceSheet.tsx.
export function PlacePopover({
  date,
  today,
  home,
  current,
  onPick,
  onClose,
}: {
  date: string;
  today: string;
  // Her home city, with the day's weather there; null when she has none on file.
  home: HomePlace | null;
  // The city the chip shows now.
  current: string | null;
  onPick: (place: DiaryPlace | null, hit: PlaceHit | null) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [asked, setAsked] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  // The geocoder is asked at a typing pace, never per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setAsked(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const found = useApi(
    'places.search',
    { input: { q: asked, date } },
    { enabled: asked.length >= 2, staleTime: 5 * 60_000 },
  );
  const searching = q.trim().length > 0;
  const hits = searching ? (found.data?.items ?? []) : null;
  const rows: { hit: PlaceHit | null; city: string; country: string | null; home: boolean }[] = hits
    ? hits.map((h) => ({ hit: h, city: h.city, country: h.country, home: false }))
    : [
        ...(home ? [{ hit: null, city: home.city, country: null, home: true }] : []),
        ...recentPlaces()
          .filter((r) => !home || r.city !== home.city)
          .map((r) => ({ hit: r, city: r.city, country: r.country, home: false })),
      ];
  const choose = (row: (typeof rows)[number]) => {
    if (row.home || !row.hit) onPick(null, null);
    else {
      rememberPlace(row.hit);
      const { weather: _w, ...place } = row.hit;
      onPick(place, row.hit);
    }
  };
  const none = searching && asked === q.trim() && found.data && hits?.length === 0;
  return (
    <div
      data-testid="place-popover"
      className="mt-0.5 rounded-card border border-rule-mid bg-surface-raised p-2 shadow-[0_14px_34px_-22px_color-mix(in_srgb,var(--color-ink)_45%,transparent)]"
    >
      <label className="flex h-[38px] items-center gap-2 rounded-pill border border-rule-mid bg-bg pr-1.5 pl-3">
        <Icon name="pin" size={12} className="shrink-0 text-ink-muted" />
        <span className="sr-only">{copy.search}</span>
        <input
          ref={input}
          type="search"
          value={q}
          placeholder={copy.search}
          autoComplete="off"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && rows[0]) choose(rows[0]);
          }}
          className="min-w-0 flex-1 bg-transparent font-sans text-ink text-sm font-light placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="button"
          aria-label={copy.close}
          onClick={onClose}
          className={`flex size-7 items-center justify-center rounded-pill text-ink-muted ${focus}`}
        >
          <Icon name="close" size={14} />
        </button>
      </label>
      <p className="mx-2 mt-2 font-display text-[13px] font-light text-ink-muted italic">
        {date === today
          ? copy.forToday
          : copy.forDay(`${weekdayLong(date)} ${Number(date.slice(8))}`)}
      </p>
      {rows.length ? (
        <p className="mx-2 mt-2.5 mb-1 font-sans text-[9px] text-ink-faint uppercase tracking-[0.18em]">
          {searching ? copy.cities : copy.recent}
        </p>
      ) : null}
      <ul>
        {rows.map((row) => {
          const wx = row.home ? home?.weather : row.hit?.weather;
          const icon = weatherIcon(wx?.code);
          return (
            // Two towns can share a name and a country (Paris, Texas and Paris, Tennessee).
            <li key={row.hit ? `${row.hit.lat},${row.hit.lon}` : 'home'}>
              <button
                type="button"
                onClick={() => choose(row)}
                className={`flex min-h-[42px] w-full items-center gap-2.5 rounded-input px-2 text-left ${
                  row.city === current ? 'bg-selected' : 'hover:bg-surface'
                } ${focus}`}
              >
                <span className="min-w-0 flex-1 truncate font-sans text-[13px] text-ink">
                  {row.city}
                  {row.country ? <span className="text-ink-faint"> · {row.country}</span> : null}
                </span>
                {row.home ? (
                  <span className="shrink-0 font-sans text-[9px] text-ink-faint uppercase tracking-[0.14em]">
                    {copy.home}
                  </span>
                ) : null}
                {wx ? (
                  <span className="flex shrink-0 items-center gap-1 font-sans text-[11px] text-ink-muted">
                    {icon ? <Icon name={icon} size={12} /> : null}
                    {shortRange(wx.tempRange)}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {none ? (
        <p className="px-2 pt-3 pb-1.5 font-display text-ink-muted text-sm font-light italic">
          {copy.none(q.trim())}
        </p>
      ) : null}
    </div>
  );
}
