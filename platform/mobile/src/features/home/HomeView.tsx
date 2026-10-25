import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { Look, Today } from '@robes/contracts';
import { home as copy, lookbook, today as todayCopy } from '@robes/copy';
import { weekdayShort } from '@robes/core/calendar';
import {
  greetingName,
  type HomeStep,
  noticedLine,
  resolveHome,
  WORE_IT_HOUR,
} from '@robes/core/home';
import { anchorName } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import {
  ErrorText,
  Eyebrow,
  fonts,
  Heading,
  Image,
  MIN_TOUCH,
  PrimaryScope,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, type ScrollViewInstance, View } from 'react-native';
import { isTerminal } from '@/features/looks/ideas';
import { LookTile } from '@/features/looks/LookTile';
import { DayDots } from '@/features/plan/DayDots';
import { dayLabel } from '@/features/plan/plan';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import { HomeBox, type HomeBoxHandle } from './HomeBox';
import { StepCard, StepMap } from './HomeSteps';

const WEATHER_STALE_MS = 30 * 60_000;

const isRunning = (t: Today | undefined) => t?.tray.some((j) => !isTerminal(j)) ?? false;

const weekdayLong = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });

// The modular home (legacy 0478e63), the same read as the web: H0 · H1 · H2 · the next step and
// the map while onboarding · the week once activated · Saved then Suggested.
export function HomeView({ dress = null }: { dress?: string | null } = {}) {
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useApi('today.get', undefined, {
    refetchInterval: (q) => (isRunning(q.state.data) ? 2_000 : false),
  });
  // The day's forecast changes slowly: no refetch on every focus or mount.
  const weather = useApi('today.weather', undefined, {
    staleTime: WEATHER_STALE_MS,
    refetchOnWindowFocus: false,
  });
  const faint = useColor('ink-faint');
  const [force, setForce] = useState<HomeStep | null>(null);
  const [dressDate, setDressDate] = useState<string | null>(dress);
  // The tab stays mounted: a day page's "Dress this day…" arms the box on its date.
  useEffect(() => {
    if (dress) setDressDate(dress);
  }, [dress]);
  const box = useRef<HomeBoxHandle>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const data = query.data;
  if (query.isError) {
    return (
      <View className="flex-1 justify-center px-6">
        <ErrorText>{errorMessage(query.error)}</ErrorText>
      </View>
    );
  }
  if (!data) return null;
  const home = data.home;
  const resolved = resolveHome(home.state, { force });
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
  const later = (step: HomeStep) => {
    if (force === step) setForce(null);
    void api
      .call('me.home.later', { input: { step } })
      .then(refresh)
      .catch((err) => toast.show({ message: errorMessage(err) }));
  };
  const wx = weather.data;
  const weatherLine = wx ? copy.weather(wx.city, wx.tempRange, wx.condition) : null;
  // Beta's H0 meta: the weekday, then where she is and the day's range once the forecast lands.
  const metaLine = copy.meta(weekdayLong(data.date), wx?.city ?? null, wx?.tempRange ?? null);

  return (
    <ScrollView
      ref={scroll}
      contentContainerClassName="gap-7 px-5 pt-[22px] pb-8"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }
    >
      <PrimaryScope>
        <View className="gap-1.5">
          <Heading size="xl" style={{ fontSize: 38, lineHeight: 42 }}>
            {todayCopy.greeting(greetingName(data.firstName), data.hour)}
          </Heading>
          <Text tone="muted" italic style={{ fontSize: 21 }}>
            {copy.echo}
          </Text>
          <View
            className="mt-1.5 flex-row items-center gap-2"
            accessible
            accessibilityLabel={metaLine}
            testID="home-meta"
          >
            <Icon name="today" size={16} color={faint} />
            <Eyebrow>{metaLine}</Eyebrow>
          </View>
        </View>

        <Alerts data={data} onChanged={refresh} />

        <HomeBox
          ref={box}
          placeholder={lookbook.prompt.doorNew}
          date={dressDate}
          onDateClear={() => setDressDate(null)}
          hasPieces={home.state.pics > 0}
        />

        {resolved.modules.includes('H3') ? (
          <Week
            data={data}
            weatherLine={weatherLine}
            onChanged={refresh}
            onDress={(date) => {
              setDressDate(date);
              scroll.current?.scrollTo({ y: 0, animated: true });
              box.current?.focus();
            }}
          />
        ) : null}

        {resolved.next ? <StepCard step={resolved.next} home={home} onLater={later} /> : null}
        {!resolved.activated ? (
          <StepMap resolved={resolved} pics={home.state.pics} onExpand={setForce} />
        ) : null}

        <LookRow
          title={copy.saved}
          looks={home.saved}
          kind="saved"
          onAll={() => router.push('/looks')}
        />
        <LookRow
          title={copy.suggested}
          looks={home.suggested}
          kind="suggested"
          onAll={() => router.push({ pathname: '/looks', params: { tab: 'suggested' } })}
        />

        {resolved.activated ? (
          <StepMap resolved={resolved} pics={home.state.pics} onExpand={setForce} />
        ) : null}
      </PrimaryScope>
    </ScrollView>
  );
}

// H1 · alerts: held receipts and one line Robes noticed. The look Robes made overnight is
// today's card in the week, never a second row saying the same thing.
function Alerts({ data, onChanged }: { data: Today; onChanged: () => void }) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const { receipts, noticed } = data.home;
  const answer = (id: string, keep: boolean) =>
    void api
      .call(keep ? 'me.dna.observations.keep' : 'me.dna.observations.dismiss', { params: { id } })
      .then(onChanged)
      .catch((err) => toast.show({ message: errorMessage(err) }));
  const row = (
    key: string,
    eyebrow: string,
    line: string,
    acts: { label: string; onPress: () => void }[],
  ) => (
    <View
      key={key}
      className="flex-row items-center gap-3 border-hairline border-b py-3"
      testID={`alert-${key}`}
    >
      <View className="flex-1">
        <Text size="caption" tone="muted" className="uppercase">
          {eyebrow}
        </Text>
        <Text numberOfLines={1}>{line}</Text>
      </View>
      {acts.map((a) => (
        <Pressable
          key={a.label}
          accessibilityRole="button"
          accessibilityLabel={a.label}
          onPress={a.onPress}
          hitSlop={8}
        >
          <Text size="small" className="underline">
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
  const rows = [];
  if (receipts) {
    rows.push(
      row(
        'receipt',
        copy.alerts.receiptFrom(receipts.retailer, receipts.receipts),
        `${copy.alerts.receiptRead(receipts.pieces)} ${copy.alerts.receiptReady}`,
        [
          {
            label: copy.alerts.review,
            onPress: () => router.push({ pathname: '/wardrobe', params: { segment: 'inbox' } }),
          },
        ],
      ),
    );
  }
  if (noticed) {
    rows.push(
      row('noticed', copy.alerts.noticed, noticedLine(noticed.text), [
        { label: copy.alerts.keep, onPress: () => answer(noticed.id, true) },
        { label: copy.alerts.notMe, onPress: () => answer(noticed.id, false) },
      ]),
    );
  }
  return rows.length ? <View>{rows}</View> : null;
}

// H3 · the week: a tap selects a day; its card sits beneath. Today is raised white on the fine
// edge with its rose label (beta's strip); a day she selects takes the warm selected edge.
function Week({
  data,
  weatherLine,
  onDress,
  onChanged,
}: {
  data: Today;
  weatherLine: string | null;
  onDress: (date: string | null) => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const muted = useColor('ink-muted');
  const [selected, setSelected] = useState(data.date);
  const day = data.week.find((d) => d.date === selected) ?? data.week[0];
  const isToday = day?.date === data.date;
  const label = !day ? '' : isToday ? copy.week.today : weekdayLong(day.date);
  const look = day?.first ?? null;
  // The look Robes made overnight stands in for an empty today (it used to be a second row).
  const overnight = isToday && !look ? data.overnight : null;
  const eyebrow = (text: string) => (
    <Text
      className={`text-[11px] uppercase ${isToday ? 'text-accent-warm' : 'text-ink-faint'}`}
      style={{ fontFamily: fonts.sansRegular, letterSpacing: 2.42 }}
    >
      {text}
    </Text>
  );
  const name = (text: string) => (
    <Text numberOfLines={1} className="text-[22px] text-ink" style={{ fontFamily: fonts.display }}>
      {text}
    </Text>
  );
  const card = 'flex-row items-center gap-3.5 rounded-[12px] border py-2.5 pr-3.5 pl-2.5';
  return (
    <View className="gap-2.5" testID="home-week">
      <View className="min-h-6 flex-row items-center justify-between">
        <Eyebrow>{copy.week.title}</Eyebrow>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/plan')}
          hitSlop={12}
          style={{ minHeight: MIN_TOUCH }}
          className="justify-center"
        >
          <Text className="text-[13px] text-ink-muted">{copy.week.diary}</Text>
        </Pressable>
      </View>
      <View className="flex-row gap-1">
        {data.week.map((d) => {
          const today = d.date === data.date;
          const sel = d.date === selected;
          return (
            <Pressable
              key={d.date}
              accessibilityRole="button"
              accessibilityState={{ selected: sel }}
              accessibilityLabel={todayCopy.weekDay(dayLabel(d.date, data.date), d.looks)}
              onPress={() => setSelected(d.date)}
              testID={`week-day-${d.date}`}
              className={`h-[70px] flex-1 items-center justify-center gap-0.5 rounded-[12px] border ${
                today
                  ? 'border-rule-mid bg-surface-raised'
                  : sel
                    ? 'border-selected-line bg-surface-raised'
                    : 'border-transparent'
              }`}
            >
              <Text
                className={`text-[9px] uppercase ${today ? 'text-accent-warm' : 'text-ink-faint'}`}
                style={{ fontFamily: fonts.sansRegular, letterSpacing: 1.26 }}
              >
                {today ? copy.week.today : weekdayShort(d.date)}
              </Text>
              <Text
                className="text-[26px] text-ink"
                style={{
                  fontFamily: today ? fonts.displayRegular : fonts.display,
                  lineHeight: 28,
                }}
              >
                {Number(d.date.slice(8))}
              </Text>
              <DayDots looks={d.looks} past={today} />
            </Pressable>
          );
        })}
      </View>
      {day && look ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={copy.week.open(look.name)}
          onPress={() => router.push(`/day/${day.date}`)}
          className={`${card} border-hairline bg-surface-raised`}
          testID="day-card"
        >
          <View style={{ width: 52 }}>
            {renditionUri(look.image, 52) ? (
              <Image source={renditionUri(look.image, 52) ?? ''} alt="" className="rounded-[4px]" />
            ) : (
              <View className="aspect-[4/5] rounded-[4px] bg-surface-sunk" />
            )}
          </View>
          <View className="flex-1 gap-0.5">
            {eyebrow(`${label}${day.looks > 1 ? copy.week.looks(day.looks) : ''}`)}
            {name(look.name)}
            {look.worn ? (
              <Text className="text-xs text-ink-muted">{copy.week.worn}</Text>
            ) : isToday && data.hour >= WORE_IT_HOUR ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.week.woreIt}
                onPress={() =>
                  void api
                    .call('looks.wear', { params: { id: look.id }, input: { wornOn: day.date } })
                    .then(onChanged)
                    .catch((err) => toast.show({ message: errorMessage(err) }))
                }
              >
                <Text className="text-xs text-ink underline">{copy.week.woreIt}</Text>
              </Pressable>
            ) : isToday && weatherLine ? (
              <Text className="text-xs text-ink-muted">{weatherLine}</Text>
            ) : null}
          </View>
          <Icon name="forward" size={18} color={muted} />
        </Pressable>
      ) : overnight ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={copy.week.open(overnight.headline || overnight.title)}
          onPress={() => router.push(`/today/look/${overnight.id}`)}
          className={`${card} border-hairline bg-surface-raised`}
          testID="day-card"
        >
          <View className="aspect-[4/5] w-[52px] rounded-[4px] bg-surface-sunk" />
          <View className="flex-1 gap-0.5">
            {eyebrow(copy.week.today)}
            {name(overnight.headline || overnight.title)}
            {weatherLine ? <Text className="text-xs text-ink-muted">{weatherLine}</Text> : null}
          </View>
          <Icon name="forward" size={18} color={muted} />
        </Pressable>
      ) : day ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isToday ? copy.week.dressToday : copy.week.dress(label)}
          onPress={() => onDress(isToday ? null : day.date)}
          className={`${card} border-border-control border-dashed`}
          testID="day-card"
        >
          <View className="w-[52px] items-center">
            <Icon name="looks" size={22} color={muted} />
          </View>
          <View className="flex-1 gap-0.5">
            {eyebrow(label)}
            {name(isToday ? copy.week.dressToday : copy.week.dress(label))}
            <Text className="text-xs text-ink-muted">
              {isToday && weatherLine ? weatherLine : copy.week.dressLine}
            </Text>
          </View>
          <Icon name="forward" size={18} color={muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

// H4 · Saved looks then Suggested, whenever each has data; each card is the LookTile.
function LookRow({
  title,
  looks,
  kind,
  onAll,
}: {
  title: string;
  looks: Look[];
  kind: 'saved' | 'suggested';
  onAll: () => void;
}) {
  const router = useRouter();
  if (!looks.length) return null;
  return (
    <View className="gap-2.5" testID={`home-${kind}`}>
      <View className="min-h-6 flex-row items-center justify-between">
        <Eyebrow>{title}</Eyebrow>
        <Pressable
          accessibilityRole="link"
          onPress={onAll}
          hitSlop={12}
          style={{ minHeight: MIN_TOUCH }}
          className="justify-center"
        >
          <Text className="text-[13px] text-ink-muted">{copy.viewAllMore}</Text>
        </Pressable>
      </View>
      <View className="flex-row flex-wrap justify-between gap-y-3">
        {looks.map((look) => {
          const around = look.anchor ? anchorName(look.anchor.label, look.anchor.brand) : '';
          return (
            <View key={look.id} style={{ width: '48.4%' }}>
              <LookTile
                look={look}
                eyebrow={copy.lookEyebrow}
                meta={
                  kind === 'suggested'
                    ? around
                      ? copy.aroundYour(around)
                      : copy.fromPrompt
                    : lookbook.meta.pieces(look.pieces.length)
                }
                onPress={() => router.push(`/look/${look.id}`)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
