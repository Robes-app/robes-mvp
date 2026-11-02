import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { DiaryDay, DiaryPlace, Piece, PlaceHit } from '@robes/contracts';
import { diary, lookbook } from '@robes/copy';
import { weekdayDay, weekdayLong } from '@robes/core/calendar';
import { isTripAsk } from '@robes/core/home';
import { ASK_MAX_CHARS, type Balance, readBalance } from '@robes/core/looks';
import { shortRange, weatherIcon } from '@robes/core/weather';
import { Icon } from '@robes/icons/native';
import { ErrorText, fonts, Image, Text, useColor } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text as RNText, TextInput, type TextInputInstance, View } from 'react-native';
import { BalanceQuestion } from '@/features/looks/BalanceQuestion';
import { WardrobePicker } from '@/features/wardrobe/WardrobePicker';
import { nativeAnalytics } from '@/lib/analytics';
import { errorMessage } from '@/lib/errors';
import { useFeatures } from '@/lib/features';
import { renditionUri } from '@/lib/images';
import { type HomePlace, PlaceSheet } from './PlaceSheet';

const copy = diary.door;
type Steer = { balance: Balance } | { balanceNote: string };

// The chips stand 28pt (design 3k); a tap reaches them from 8pt either side (44pt).
const CHIP_SLOP = { top: 8, bottom: 8 };
const chip = 'min-h-7 flex-row items-center gap-1.5 rounded-pill border px-2.5';
const warm = `${chip} border-selected-line bg-selected`;
const quiet = `${chip} border-rule-mid bg-surface-raised`;
// The day chip is passive: it names the day she picked on the strip and is never a date field.
const passive = `${chip} border-ink/10 bg-ink/5`;

function ChipText({ children, faded = false }: { children: string; faded?: boolean }) {
  return (
    <RNText
      className={`text-[11px] ${faded ? 'text-ink/40' : 'text-ink'}`}
      style={{ fontFamily: fonts.sans }}
      numberOfLines={1}
    >
      {children}
    </RNText>
  );
}

// A 20pt × inside a chip (its hit reaches the chip's 44pt band).
function ChipClose({ label, onPress }: { label: string; onPress: () => void }) {
  const muted = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 4, right: 8 }}
      className="size-5 items-center justify-center rounded-pill"
    >
      <Icon name="close" size={11} color={muted} />
    </Pressable>
  );
}

// The prompt box (Front Door design 3k, plan 2026-11-02 §1.8): the day chip, the place chip with
// its weather (× leaves the weather out), the hanger to build the day around pieces of hers, her
// words in the serif, → once there is anything to send. Her words become three suggested looks
// for the day on the deck; nothing reaches the day until she saves one. The web twin is
// app/src/components/home/prompt-box.tsx.
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
  const { features } = useFeatures();
  const field = useRef<TextInputInstance>(null);
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
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
  // The sheet belongs to the day it opened on.
  // biome-ignore lint/correctness/useExhaustiveDependencies: closes when the day changes
  useEffect(() => setPlaceOpen(false), [day.date]);

  const isToday = day.date === today;
  const city = day.place?.city ?? home?.city ?? null;
  const wx = day.weather;
  const wxIcon = weatherIcon(wx?.code);
  const off = Boolean(weatherOff[day.date]);
  const dayWord = isToday ? 'today' : weekdayLong(day.date);
  const dayLabel = isToday ? diary.today : weekdayDay(day.date);

  const refreshDiary = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
  const setPlace = (place: DiaryPlace | null, _hit: PlaceHit | null) => {
    setPlaceOpen(false);
    void api
      .call('plan.place', { params: { date: day.date }, input: { place } })
      .then(refreshDiary)
      .catch((err) => setError(errorMessage(err)));
  };

  const holdFor = (words: string, steer: Steer | undefined) => {
    if (steer || !(hasPieces || pieces.length)) return false;
    nativeAnalytics.track('balance_asked', { surface: 'home', piece: pieces.length > 0 });
    setHeld(words);
    setText('');
    return true;
  };

  async function send(steer?: Steer): Promise<void> {
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
      nativeAnalytics.track('balance_answered', {
        surface: 'home',
        balance: 'balance' in steer ? steer.balance : 'words',
      });
    if (words.length < 2 && pieces.length === 0) return;
    if (isTripAsk(words) && features.trips && pieces.length === 0) {
      router.push({ pathname: '/trip/new', params: { brief: words } });
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
      nativeAnalytics.track('prompt_submitted', {
        surface: 'home',
        intent: 'words',
        scope: 'day',
        ok: true,
      });
      // The tab stays mounted: the box is clean when she comes back from the deck.
      setText('');
      setHeld(null);
      setPieces([]);
      setBusy(null);
      router.push({ pathname: '/looks/job/[jobId]', params: { jobId, from: 'home' } });
    } catch (err) {
      nativeAnalytics.track('prompt_submitted', {
        surface: 'home',
        intent: 'words',
        scope: 'day',
        ok: false,
      });
      setBusy(null);
      if (held !== null) setText(words);
      setHeld(null);
      setError(errorMessage(err));
    }
  }

  const ready =
    held !== null ? text.trim().length > 0 : text.trim().length >= 2 || pieces.length > 0;
  const placeholder =
    held !== null
      ? lookbook.prompt.balance.typed
      : isToday
        ? copy.today
        : copy.day(weekdayLong(day.date));

  return (
    <View className="gap-2" accessibilityLabel={lookbook.prompt.newLabel} testID="prompt-box">
      <View className="rounded-sheet border border-rule-mid bg-bg px-1.5 pt-2.5 pb-1.5">
        <View className="gap-1.5 px-1.5">
          <View className="flex-row items-start gap-1.5">
            <View className="min-w-0 flex-1 flex-row flex-wrap gap-1.5">
              <View
                className={passive}
                accessible
                accessibilityLabel={copy.dayChip(dayLabel)}
                testID="day-chip"
              >
                <Icon name="plan" size={11} color={faint} />
                <ChipText faded>{dayLabel}</ChipText>
              </View>
              {off ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.weatherBack}
                  onPress={() => setWeatherOff((w) => ({ ...w, [day.date]: false }))}
                  hitSlop={CHIP_SLOP}
                  className={quiet}
                  testID="weather-chip"
                >
                  <ChipText>{copy.weather}</ChipText>
                </Pressable>
              ) : city ? (
                <View className={`${warm} pr-0`} testID="place-chip">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={copy.changePlace}
                    accessibilityState={{ expanded: placeOpen }}
                    onPress={() => setPlaceOpen((o) => !o)}
                    hitSlop={CHIP_SLOP}
                    className="h-full flex-row items-center gap-1.5 rounded-pill"
                  >
                    <Icon name="pin" size={11} color={ink} />
                    <ChipText>{city}</ChipText>
                    {wx ? (
                      <>
                        <RNText className="text-[11px] text-ink-faint">·</RNText>
                        {wxIcon ? <Icon name={wxIcon} size={11} color={ink} /> : null}
                        <ChipText>{shortRange(wx.tempRange)}</ChipText>
                      </>
                    ) : null}
                  </Pressable>
                  <ChipClose
                    label={copy.weatherOut}
                    onPress={() => setWeatherOff((w) => ({ ...w, [day.date]: true }))}
                  />
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={diary.place.search}
                  accessibilityState={{ expanded: placeOpen }}
                  onPress={() => setPlaceOpen((o) => !o)}
                  hitSlop={CHIP_SLOP}
                  className={quiet}
                  testID="place-chip"
                >
                  <Icon name="pin" size={11} color={ink} />
                  <ChipText>{diary.place.search}</ChipText>
                </Pressable>
              )}
            </View>
            {/* The hanger: warm while it holds pieces, with their count and a × to let them go. */}
            <View
              className={`${pieces.length || flyout ? warm : quiet} ${
                pieces.length ? 'pr-0 pl-2' : 'w-7 justify-center px-0'
              }`}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={pieces.length ? copy.piecesOn(pieces.length) : copy.pieces}
                onPress={() => setFlyout(true)}
                hitSlop={CHIP_SLOP}
                className={`h-full flex-row items-center gap-1.5 rounded-pill ${
                  pieces.length ? '' : 'w-7 justify-center'
                }`}
                testID="hanger"
              >
                <Icon name="wardrobe" size={13} color={ink} />
                {pieces.length ? <ChipText>{String(pieces.length)}</ChipText> : null}
              </Pressable>
              {pieces.length ? (
                <ChipClose label={copy.removePieces} onPress={() => setPieces([])} />
              ) : null}
            </View>
          </View>
          {pieces.length ? (
            <View
              className="flex-row flex-wrap gap-1.5"
              accessibilityLabel={copy.piecesOn(pieces.length)}
            >
              {pieces.map((p) => {
                const thumb = renditionUri(p.image, 20);
                return (
                  <View
                    key={p.id}
                    className={`${warm} gap-1.5 pr-0 pl-[3px]`}
                    testID={`piece-token-${p.id}`}
                  >
                    <View className="size-5 overflow-hidden rounded-pill bg-surface-raised">
                      {thumb ? <Image source={thumb} alt="" aspect="1:1" /> : null}
                    </View>
                    <ChipText>{p.label}</ChipText>
                    <ChipClose
                      label={copy.removePiece(p.label)}
                      onPress={() => setPieces((ps) => ps.filter((x) => x.id !== p.id))}
                    />
                  </View>
                );
              })}
            </View>
          ) : null}
          {held !== null ? (
            <View className="pt-1">
              <BalanceQuestion
                echo={held}
                disabled={busy !== null}
                onPick={(b) => void send({ balance: b })}
              />
            </View>
          ) : null}
        </View>
        <View className="mt-1.5 min-h-12 flex-row items-center gap-2.5 pl-1.5">
          <TextInput
            ref={field}
            accessibilityLabel={placeholder}
            placeholder={placeholder}
            placeholderTextColor={faint}
            value={text}
            onChangeText={setText}
            maxLength={ASK_MAX_CHARS}
            multiline
            submitBehavior="submit"
            returnKeyType="send"
            onSubmitEditing={() => void send()}
            editable={busy === null}
            className="min-h-10 flex-1 py-2"
            style={{ color: ink, fontSize: 17, maxHeight: 96, fontFamily: fonts.displayItalic }}
          />
          {ready ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.send}
              accessibilityState={{ disabled: busy !== null }}
              disabled={busy !== null}
              onPress={() => void send()}
              style={{ width: 40, height: 40, minWidth: 40, minHeight: 40 }}
              hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
              className="items-center justify-center rounded-pill border border-rule-mid bg-surface-raised"
              testID="prompt-send"
            >
              <Icon name="forward" size={15} color={ink} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {busy ? (
        <Text size="small" tone="muted" italic accessibilityLiveRegion="polite">
          {busy}
        </Text>
      ) : null}
      {error ? <ErrorText size="caption">{error}</ErrorText> : null}
      <PlaceSheet
        open={placeOpen}
        date={day.date}
        today={today}
        home={home}
        current={city}
        onPick={setPlace}
        onClose={() => setPlaceOpen(false)}
      />
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
    </View>
  );
}
