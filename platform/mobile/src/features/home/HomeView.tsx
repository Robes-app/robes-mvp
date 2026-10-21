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
  PrimaryScope,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { isTerminal } from '@/features/looks/ideas';
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
export function HomeView() {
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
  const [force, setForce] = useState<HomeStep | null>(null);
  const [dressDate, setDressDate] = useState<string | null>(null);
  const box = useRef<HomeBoxHandle>(null);
  const scroll = useRef<ScrollView>(null);
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

  return (
    <ScrollView
      ref={scroll}
      contentContainerClassName="gap-8 px-6 py-8"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
      }
    >
      <PrimaryScope>
        <View className="gap-2">
          <Heading size="xl">{todayCopy.greeting(greetingName(data.firstName), data.hour)}</Heading>
          <Text tone="faint" italic>
            {copy.echo}
          </Text>
          {weatherLine ? (
            <Text
              size="small"
              tone="muted"
              accessibilityLabel={`${copy.weatherLabel}: ${weatherLine}`}
            >
              {weatherLine}
            </Text>
          ) : null}
        </View>

        <Alerts data={data} onChanged={refresh} />

        <HomeBox
          ref={box}
          placeholder={resolved.activated ? copy.doorHome : lookbook.prompt.doorNew}
          date={dressDate}
          onDateClear={() => setDressDate(null)}
          hasPieces={home.state.pics > 0}
        />

        {resolved.next ? <StepCard step={resolved.next} home={home} onLater={later} /> : null}
        {!resolved.activated ? (
          <StepMap resolved={resolved} pics={home.state.pics} onExpand={setForce} />
        ) : null}

        {resolved.activated ? (
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

// H1 · alerts: held receipts, the overnight look, one line Robes noticed.
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
  if (data.overnight) {
    const id = data.overnight.id;
    rows.push(
      row('overnight', todayCopy.overnight.title, data.overnight.headline || data.overnight.title, [
        { label: `${todayCopy.overnight.open} ›`, onPress: () => router.push(`/today/look/${id}`) },
      ]),
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

// H3 · the week: a tap selects a day; its card sits beneath.
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
  return (
    <View className="gap-3" testID="home-week">
      <View className="flex-row items-baseline justify-between">
        <Eyebrow>{copy.week.title}</Eyebrow>
        <Pressable accessibilityRole="link" onPress={() => router.push('/plan')} hitSlop={12}>
          <Text className="underline">{copy.week.diary}</Text>
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
              className={`min-h-[72px] flex-1 items-center justify-center gap-1.5 rounded-crisp border py-2 ${
                sel ? 'border-hairline bg-surface' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-[9px] uppercase ${today ? 'text-accent-warm' : 'text-ink-faint'}`}
                style={{ fontFamily: fonts.sans, letterSpacing: 1.4 }}
              >
                {today ? copy.week.today : weekdayShort(d.date)}
              </Text>
              <Text className="text-2xl text-ink" style={{ fontFamily: fonts.displayRegular }}>
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
          className="flex-row items-center gap-4 rounded-soft border border-hairline bg-surface p-3"
          testID="day-card"
        >
          <View style={{ width: 56 }}>
            {renditionUri(look.image, 56) ? (
              <Image source={renditionUri(look.image, 56) ?? ''} alt="" />
            ) : (
              <View className="aspect-[4/5] rounded-crisp bg-surface-sunk" />
            )}
          </View>
          <View className="flex-1 gap-0.5">
            <Text size="caption" tone="muted" className="uppercase">
              {label}
              {day.looks > 1 ? copy.week.looks(day.looks) : ''}
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontFamily: fonts.displayRegular }}
              className="text-lg"
            >
              {look.name}
            </Text>
            {look.worn ? (
              <Text size="small" tone="muted">
                {copy.week.worn}
              </Text>
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
                <Text size="small" className="underline">
                  {copy.week.woreIt}
                </Text>
              </Pressable>
            ) : isToday && weatherLine ? (
              <Text size="small" tone="muted">
                {weatherLine}
              </Text>
            ) : null}
          </View>
          <Icon name="forward" size={20} color={muted} />
        </Pressable>
      ) : day ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isToday ? copy.week.dressToday : copy.week.dress(label)}
          onPress={() => onDress(isToday ? null : day.date)}
          className="flex-row items-center gap-4 rounded-soft border border-border-control border-dashed p-3"
          testID="day-card"
        >
          <Icon name="looks" size={22} color={muted} />
          <View className="flex-1 gap-0.5">
            <Text size="caption" tone="muted" className="uppercase">
              {label}
            </Text>
            <Text style={{ fontFamily: fonts.displayRegular }} className="text-lg">
              {isToday ? copy.week.dressToday : copy.week.dress(label)}
            </Text>
            <Text size="small" tone="muted">
              {copy.week.dressLine}
            </Text>
          </View>
          <Icon name="forward" size={20} color={muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

// H4 · Saved looks then Suggested, whenever each has data; a card opens its look.
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
    <View className="gap-3" testID={`home-${kind}`}>
      <View className="flex-row items-baseline justify-between">
        <Eyebrow>{title}</Eyebrow>
        <Pressable accessibilityRole="link" onPress={onAll} hitSlop={12}>
          <Text className="underline">{copy.viewAll}</Text>
        </Pressable>
      </View>
      <View className="flex-row flex-wrap gap-4">
        {looks.map((look) => {
          const around = look.anchor ? anchorName(look.anchor.label, look.anchor.brand) : '';
          const uri = renditionUri(look.image ?? look.pieces[0]?.piece.image, 160);
          return (
            <Pressable
              key={look.id}
              accessibilityRole="link"
              accessibilityLabel={look.name}
              onPress={() => router.push(`/look/${look.id}`)}
              className="gap-2"
              style={{ width: '47%' }}
            >
              {uri ? (
                <Image source={uri} alt="" blurhash={look.image?.blurhash} />
              ) : (
                <View className="aspect-[4/5] rounded-crisp bg-surface-sunk" />
              )}
              <Text
                numberOfLines={1}
                style={{ fontFamily: fonts.displayRegular }}
                className="text-lg"
              >
                {look.name}
              </Text>
              <Text size="caption" tone="muted" numberOfLines={1}>
                {kind === 'suggested'
                  ? around
                    ? copy.aroundYour(around)
                    : copy.fromPrompt
                  : lookbook.meta.pieces(look.pieces.length)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
