import { useApi } from '@robes/api-client/react';
import type { DiaryPlace, PlaceHit } from '@robes/contracts';
import { diary } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { shortRange, weatherIcon } from '@robes/core/weather';
import { Icon } from '@robes/icons/native';
import { fonts, IconButton, maxFontSizeMultiplier, Sheet, Text, useColor } from '@robes/ui-native';
import { useEffect, useState } from 'react';
import { Pressable, Text as RNText, TextInput, View } from 'react-native';

const copy = diary.place;

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

type Row = { hit: PlaceHit | null; city: string; country: string | null; home: boolean };

function Caps({ children }: { children: string }) {
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier.label}
      className="text-ink-faint uppercase"
      style={{ fontFamily: fonts.sansRegular, fontSize: 9, letterSpacing: 1.6 }}
    >
      {children}
    </RNText>
  );
}

// The place sheet (design 3k, plan §1.8): a search for a city, "For today only", then Home and
// recent — or the cities found as she types, each with the day's range. Return picks the first.
// The web twin is app/src/components/home/place-popover.tsx (a popover under the chips).
export function PlaceSheet({
  open,
  date,
  today,
  home,
  current,
  onPick,
  onClose,
}: {
  open: boolean;
  date: string;
  today: string;
  // Her home city, with the day's weather there; null when she has none on file.
  home: HomePlace | null;
  // The city the chip shows now.
  current: string | null;
  onPick: (place: DiaryPlace | null, hit: PlaceHit | null) => void;
  onClose: () => void;
}) {
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');
  const [q, setQ] = useState('');
  const [asked, setAsked] = useState('');
  // Each opening starts clean.
  useEffect(() => {
    if (open) {
      setQ('');
      setAsked('');
    }
  }, [open]);
  // The geocoder is asked at a typing pace, never per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setAsked(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const found = useApi(
    'places.search',
    { input: { q: asked, date } },
    { enabled: open && asked.length >= 2, staleTime: 5 * 60_000 },
  );
  const searching = q.trim().length > 0;
  const hits = searching ? (found.data?.items ?? []) : null;
  const rows: Row[] = hits
    ? hits.map((h) => ({ hit: h, city: h.city, country: h.country, home: false }))
    : [
        ...(home ? [{ hit: null, city: home.city, country: null, home: true }] : []),
        ...recentPlaces()
          .filter((r) => !home || r.city !== home.city)
          .map((r) => ({ hit: r, city: r.city, country: r.country, home: false })),
      ];
  const choose = (row: Row) => {
    if (row.home || !row.hit) onPick(null, null);
    else {
      rememberPlace(row.hit);
      const { weather: _w, ...place } = row.hit;
      onPick(place, row.hit);
    }
  };
  const none = searching && asked === q.trim() && found.data && hits?.length === 0;
  return (
    <Sheet open={open} onClose={onClose} testID="place-sheet">
      <View className="gap-2 pb-2">
        <View className="h-[44px] flex-row items-center gap-2 rounded-pill border border-rule-mid bg-surface-raised pr-1 pl-3.5">
          <Icon name="pin" size={13} color={muted} />
          <TextInput
            accessibilityLabel={copy.search}
            placeholder={copy.search}
            placeholderTextColor={faint}
            value={q}
            onChangeText={setQ}
            autoCorrect={false}
            autoCapitalize="words"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => {
              const first = rows[0];
              if (first) choose(first);
            }}
            className="min-h-11 flex-1 text-sm"
            style={{ color: ink, fontFamily: fonts.sans }}
            testID="place-search"
          />
          <IconButton icon="close" label={copy.close} onPress={onClose} tone="ink-muted" />
        </View>
        <Text size="caption" tone="muted" italic className="px-2">
          {date === today
            ? copy.forToday
            : copy.forDay(`${weekdayLong(date)} ${Number(date.slice(8))}`)}
        </Text>
        {rows.length ? (
          <View className="px-2 pt-1.5">
            <Caps>{searching ? copy.cities : copy.recent}</Caps>
          </View>
        ) : null}
        {rows.map((row) => {
          const wx = row.home ? home?.weather : row.hit?.weather;
          const icon = weatherIcon(wx?.code);
          const on = row.city === current;
          return (
            <Pressable
              // Two towns can share a name and a country (Paris, Texas and Paris, Tennessee).
              key={row.hit ? `${row.hit.lat},${row.hit.lon}` : 'home'}
              accessibilityRole="button"
              accessibilityLabel={[
                row.country ? `${row.city} · ${row.country}` : row.city,
                row.home ? copy.home : null,
                wx ? shortRange(wx.tempRange) : null,
              ]
                .filter(Boolean)
                .join(', ')}
              accessibilityState={{ selected: on }}
              onPress={() => choose(row)}
              className={`min-h-11 flex-row items-center gap-2.5 rounded-input px-2 ${on ? 'bg-selected' : ''}`}
              testID={`place-row-${row.city}`}
            >
              <Text size="small" numberOfLines={1} className="flex-1">
                {row.city}
                {row.country ? <Text size="small" tone="faint">{` · ${row.country}`}</Text> : null}
              </Text>
              {row.home ? <Caps>{copy.home}</Caps> : null}
              {wx ? (
                <View className="flex-row items-center gap-1">
                  {icon ? <Icon name={icon} size={12} color={muted} /> : null}
                  <Text size="caption" tone="muted">
                    {shortRange(wx.tempRange)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
        {none ? (
          <Text size="small" tone="muted" italic className="px-2 pt-2">
            {copy.none(q.trim())}
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}
