'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { DiaryDay, DiaryPlace, Piece, PlaceHit } from '@robes/contracts';
import { diary, lookbook } from '@robes/copy';
import { weekdayDay, weekdayLong } from '@robes/core/calendar';
import { isTripAsk } from '@robes/core/home';
import { ASK_MAX_CHARS, type Balance, readBalance } from '@robes/core/looks';
import { shortRange, weatherIcon } from '@robes/core/weather';
import { Icon } from '@robes/icons/web';
import { ErrorText, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { useFeatures } from '@/components/features';
import { BalanceQuestion } from '@/components/looks/balance-question';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { WardrobePicker } from '@/components/wardrobe/wardrobe-picker';
import { errorCopy } from '@/lib/error-copy';
import { type HomePlace, PlacePopover } from './place-popover';

const copy = diary.door;
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
type Steer = { balance: Balance } | { balanceNote: string };

const chip =
  'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 font-sans text-[11px]';
const warm = `${chip} border-selected-line bg-selected text-ink`;
const quiet = `${chip} border-rule-mid bg-surface-raised text-ink`;
// The day chip is passive: it names the day she picked on the strip and is never a date field.
// Sunk, in ink-muted: the design's 40% ink fell under 4.5:1 (CI run 84).
const passive = `${chip} border-hairline bg-surface-sunk text-ink-muted`;

// The prompt box (Front Door design 3k, plan 2026-11-02 §1.8): the day chip, the place chip with
// its weather (× leaves the weather out), the hanger to build the day around pieces of hers, her
// words in the serif, → once there is anything to send. Her words become three suggested looks
// for the day on the deck; nothing reaches the day until she saves one. The native twin is
// mobile/src/features/home/PromptBox.tsx.
export function PromptBox({
  day,
  today,
  home,
  hasPieces,
}: {
  day: DiaryDay;
  today: string;
  // Her home city with the day's weather there, from the diary's own day.
  home: HomePlace | null;
  hasPieces: boolean;
}) {
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const features = useFeatures();
  const id = useId();
  const field = useRef<HTMLTextAreaElement>(null);
  const { track } = useAnalytics().analytics;
  const [text, setText] = useState('');
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [flyout, setFlyout] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  // × on the weather, per day, for the session; a tap on Weather brings it back.
  const [weatherOff, setWeatherOff] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Her ask, held while the box asks where its pieces come from.
  const [held, setHeld] = useState<string | null>(null);
  // The popover belongs to the day it opened on.
  // biome-ignore lint/correctness/useExhaustiveDependencies: closes when the day changes
  useEffect(() => setPlaceOpen(false), [day.date]);

  const isToday = day.date === today;
  const city = day.place?.city ?? home?.city ?? null;
  const wx = day.weather;
  const wxIcon = weatherIcon(wx?.code);
  const off = Boolean(weatherOff[day.date]);
  const dayWord = isToday ? 'today' : weekdayLong(day.date);

  const refreshDiary = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
  const setPlace = (place: DiaryPlace | null, _hit: PlaceHit | null) => {
    setPlaceOpen(false);
    void api
      .call('plan.place', { params: { date: day.date }, input: { place } })
      .then(refreshDiary)
      .catch((err) => setError(errorCopy(err)));
  };

  const holdFor = (words: string, steer: Steer | undefined) => {
    if (steer || !(hasPieces || pieces.length)) return false;
    track('balance_asked', { surface: 'home', piece: pieces.length > 0 });
    setHeld(words);
    setText('');
    return true;
  };

  async function send(steer?: Steer) {
    if (busy) return;
    if (held !== null && !steer) {
      const read = readBalance(text);
      if (read.balance) void send({ balance: read.balance });
      else if (read.note) void send({ balanceNote: read.note });
      return;
    }
    const words = (held ?? text).trim();
    setError(null);
    if (steer)
      track('balance_answered', {
        surface: 'home',
        balance: 'balance' in steer ? steer.balance : 'words',
      });
    if (words.length < 2 && pieces.length === 0) return;
    if (isTripAsk(words) && features.trips && pieces.length === 0) {
      router.push(`/trip/new?brief=${encodeURIComponent(words)}`);
      return;
    }
    if (holdFor(words, steer)) return;
    setBusy(lookbook.prompt.busyRead);
    try {
      const { jobId } = await api.call('looks.prompt', {
        input: {
          prompt: words.length >= 2 ? words : copy.day(weekdayLong(day.date)),
          date: day.date,
          ...(pieces.length ? { pieceIds: pieces.map((p) => p.id) } : {}),
          ...(day.place && !off ? { place: day.place } : {}),
          ...(off ? { weather: false } : {}),
          ...steer,
        },
      });
      track('prompt_submitted', { surface: 'home', intent: 'words', scope: 'day', ok: true });
      router.push(`/looks/style/${jobId}?from=home`);
    } catch (err) {
      track('prompt_submitted', { surface: 'home', intent: 'words', scope: 'day', ok: false });
      setBusy(null);
      if (held !== null) setText(words);
      setHeld(null);
      setError(errorCopy(err));
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };
  const ready =
    held !== null ? text.trim().length > 0 : text.trim().length >= 2 || pieces.length > 0;
  const placeholder =
    held !== null
      ? lookbook.prompt.balance.typed
      : isToday
        ? copy.today
        : copy.day(weekdayLong(day.date));

  return (
    <fieldset
      aria-label={lookbook.prompt.newLabel}
      className="flex min-w-0 flex-col gap-2"
      data-testid="prompt-box"
    >
      <div className="rounded-sheet border border-rule-mid bg-bg px-1.5 pt-2.5 pb-1.5 has-[textarea:focus-visible]:border-ink">
        <div className="flex flex-col gap-1.5 px-1.5">
          <div className="flex items-start gap-1.5">
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              <span className={passive} data-testid="day-chip" aria-hidden>
                <Icon name="plan" size={11} />
                {isToday ? diary.today : weekdayDay(day.date)}
              </span>
              <span className="sr-only">
                {copy.dayChip(isToday ? diary.today : weekdayDay(day.date))}
              </span>
              {off ? (
                <button
                  type="button"
                  onClick={() => setWeatherOff((w) => ({ ...w, [day.date]: false }))}
                  aria-label={copy.weatherBack}
                  data-testid="weather-chip"
                  data-state="off"
                  className={`${quiet} ${focus}`}
                >
                  {copy.weather}
                </button>
              ) : city ? (
                <span className={`${warm} pr-0`} data-testid="place-chip">
                  <button
                    type="button"
                    aria-label={copy.changePlace}
                    aria-expanded={placeOpen}
                    onClick={() => setPlaceOpen((o) => !o)}
                    className={`flex h-full items-center gap-1.5 rounded-pill ${focus}`}
                  >
                    <Icon name="pin" size={11} className="shrink-0" />
                    {city}
                    {wx ? (
                      <>
                        <span aria-hidden className="text-ink-faint">
                          ·
                        </span>
                        {wxIcon ? <Icon name={wxIcon} size={11} /> : null}
                        {shortRange(wx.tempRange)}
                      </>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    aria-label={copy.weatherOut}
                    title={copy.weatherOut}
                    onClick={() => setWeatherOff((w) => ({ ...w, [day.date]: true }))}
                    className={`flex size-5 items-center justify-center rounded-pill text-ink-muted ${focus}`}
                  >
                    <Icon name="close" size={11} />
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  aria-expanded={placeOpen}
                  onClick={() => setPlaceOpen((o) => !o)}
                  data-testid="place-chip"
                  className={`${quiet} ${focus}`}
                >
                  <Icon name="pin" size={11} />
                  {diary.place.search}
                </button>
              )}
            </div>
            {/* The hanger: warm while it holds pieces, with their count and a × to let them go. */}
            <span
              className={`${pieces.length || flyout ? warm : quiet} shrink-0 pr-0 ${pieces.length ? 'pl-2' : 'w-7 justify-center px-0'}`}
            >
              <button
                type="button"
                aria-label={pieces.length ? copy.piecesOn(pieces.length) : copy.pieces}
                title={copy.pieces}
                onClick={() => setFlyout(true)}
                data-testid="hanger"
                className={`flex h-full items-center gap-1.5 rounded-pill ${pieces.length ? '' : 'w-7 justify-center'} ${focus}`}
              >
                <Icon name="wardrobe" size={13} />
                {pieces.length ? <span>{pieces.length}</span> : null}
              </button>
              {pieces.length ? (
                <button
                  type="button"
                  aria-label={copy.removePieces}
                  title={copy.removePieces}
                  onClick={() => setPieces([])}
                  className={`flex size-5 items-center justify-center rounded-pill text-ink-muted ${focus}`}
                >
                  <Icon name="close" size={11} />
                </button>
              ) : null}
            </span>
          </div>
          {placeOpen ? (
            <PlacePopover
              date={day.date}
              today={today}
              home={home}
              current={city}
              onPick={setPlace}
              onClose={() => setPlaceOpen(false)}
            />
          ) : null}
          {pieces.length ? (
            <ul className="flex flex-wrap gap-1.5" aria-label={copy.piecesOn(pieces.length)}>
              {pieces.map((p) => (
                <li
                  key={p.id}
                  className={`${warm} gap-1.5 pr-0 pl-[3px]`}
                  data-testid={`piece-token-${p.id}`}
                >
                  <span className="size-5 shrink-0 overflow-hidden rounded-pill bg-surface-raised">
                    <PieceImage piece={p} sizes="20px" />
                  </span>
                  <span className="truncate">{p.label}</span>
                  <button
                    type="button"
                    aria-label={copy.removePiece(p.label)}
                    onClick={() => setPieces((ps) => ps.filter((x) => x.id !== p.id))}
                    className={`flex size-5 items-center justify-center rounded-pill text-ink-muted ${focus}`}
                  >
                    <Icon name="close" size={11} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {held !== null ? (
            <div className="pt-1">
              <BalanceQuestion
                echo={held}
                disabled={busy !== null}
                onPick={(b) => void send({ balance: b })}
              />
            </div>
          ) : null}
        </div>
        <div className="mt-1.5 flex min-h-12 items-center gap-2.5 pl-1.5">
          <label htmlFor={id} className="sr-only">
            {placeholder}
          </label>
          <textarea
            ref={field}
            id={id}
            rows={1}
            value={text}
            maxLength={ASK_MAX_CHARS}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy !== null}
            className="max-h-24 min-h-10 flex-1 resize-none bg-transparent py-2 font-display text-[17px] font-light italic text-ink placeholder:text-ink-faint focus:outline-none"
          />
          {ready ? (
            <button
              type="button"
              aria-label={copy.send}
              onClick={() => void send()}
              disabled={busy !== null}
              data-testid="prompt-send"
              className={`flex size-10 shrink-0 items-center justify-center rounded-pill border border-rule-mid bg-surface-raised text-ink ${focus}`}
            >
              <Icon name="forward" size={15} />
            </button>
          ) : null}
        </div>
      </div>
      {busy ? (
        <Text size="small" tone="muted" italic role="status">
          {busy}
        </Text>
      ) : null}
      {error ? <ErrorText size="caption">{error}</ErrorText> : null}
      <WardrobePicker
        open={flyout}
        title={diary.flyout.title(dayWord)}
        carried={pieces}
        onClose={() => {
          setFlyout(false);
          field.current?.focus();
        }}
        onApply={setPieces}
      />
    </fieldset>
  );
}
