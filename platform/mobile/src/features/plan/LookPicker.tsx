import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { Look, PlanEntry } from '@robes/contracts';
import { diary as copy, lookbook } from '@robes/copy';
import { weekdayDayMonth, weekdayLong } from '@robes/core/calendar';
import { lookMatches, lookWearFor, pickerOrder, wearForOptions } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import {
  Button,
  fonts,
  maxFontSizeMultiplier,
  Pill,
  Sheet,
  Skeleton,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text as RNText, ScrollView, TextInput, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { LookTile } from '../looks/LookTile';

const BANDS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
type Band = (typeof BANDS)[number];

export type PickerMode = 'add' | 'change';

// 'today', else 'on Tuesday': how the CTA names the day. Twin of web look-picker.tsx.
export function whenWord(date: string, today: string): string {
  return date === today ? 'today' : `on ${weekdayLong(date)}`;
}
export function dayWordOf(date: string, today: string): string {
  return date === today ? 'today' : weekdayLong(date);
}

// What the drawer's one button says (design 3k, plan §1.7), the same rule as the web's.
export function drawerCta(o: {
  mode: PickerMode;
  date: string;
  today: string;
  picks: number;
  changed: boolean;
}): { label: string; ready: boolean } {
  const past = o.date < o.today;
  const dayWord = dayWordOf(o.date, o.today);
  if (o.mode === 'add') {
    return { label: copy.drawer.schedule(o.picks), ready: o.changed && o.picks > 0 };
  }
  if (!o.changed) return { label: copy.drawer.idle(dayWord), ready: false };
  if (o.picks === 0) return { label: copy.drawer.clearDay(dayWord), ready: true };
  if (past) {
    return {
      label: o.picks === 1 ? copy.drawer.woreOne(dayWord) : copy.drawer.woreMany(dayWord),
      ready: true,
    };
  }
  const when = whenWord(o.date, o.today);
  return {
    label: o.picks === 1 ? copy.drawer.wearOne(when) : copy.drawer.wearMany(o.picks, when),
    ready: true,
  };
}

// The look's line under its name in the drawer: Scheduled (on the day), Adding (ticked), else
// how often she has worn it, when she saved it, or that it waits.
export function drawerLine(look: Look, on: boolean, had: boolean): string {
  if (on && had) return copy.drawer.scheduled;
  if (on) return copy.drawer.adding;
  if (look.timesWorn > 0) return copy.drawer.wears(look.timesWorn);
  if (look.createdAt) return copy.drawer.savedOn(weekdayDayMonth(look.createdAt.slice(0, 10)));
  return copy.drawer.notWorn;
}

// A small-caps label: the drawer's YOUR LOOKS row and the Refine card's headings.
function Caps({ children, warm = false }: { children: string; warm?: boolean }) {
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier.label}
      className={`uppercase ${warm ? 'text-accent-warm' : 'text-ink-muted'}`}
      style={{ fontFamily: fonts.sansMedium, fontSize: 9, letterSpacing: 1.8 }}
    >
      {children}
    </RNText>
  );
}

// The drawer (design 3k, plan §1.7): her saved looks for a day, the day's own looks ticked as
// Scheduled. From Pick Look (`add`) she ticks one or several; from the lookbook icon on the OOTD
// (`change`) a tap replaces the look. Past days file wears, never pins (the wear is the record);
// unticking takes a look off the day. One door for the Diary too: the day page's + Add a look.
// The web twin is app/src/app/(app)/plan/look-picker.tsx.
export function LookPicker({
  date,
  today,
  mode = 'add',
  onClose,
  onChanged,
}: {
  date: string | null;
  today: string;
  mode?: PickerMode;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const api = useApiClient();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');
  const open = date !== null;
  const [picks, setPicks] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastWornFirst, setLastWornFirst] = useState(true);
  const [refining, setRefining] = useState(false);
  const [q, setQ] = useState('');
  const [bands, setBands] = useState<Band[]>([]);
  const [wear, setWear] = useState<string[]>([]);
  useEffect(() => {
    if (open) {
      setPicks(null);
      setRefining(false);
      setQ('');
      setBands([]);
      setWear([]);
    }
  }, [open]);
  const looks = useApi('looks.list', { input: { limit: 60 } }, { enabled: open });
  const day = useApi('plan.get', { input: { from: date ?? '', days: 1 } }, { enabled: open });
  const entries: PlanEntry[] = day.data?.days[0]?.entries ?? [];
  const onDay = entries.map((e) => e.look.id);
  // The day's looks start ticked; her taps move from there.
  const chosen = picks ?? onDay;
  const changed = chosen.length !== onDay.length || chosen.some((id) => !onDay.includes(id));

  const toggle = (id: string) => {
    const on = chosen.includes(id);
    if (mode === 'change') setPicks(on ? [] : [id]);
    else setPicks(on ? chosen.filter((x) => x !== id) : [...chosen, id]);
  };

  async function apply() {
    if (!date || !changed) return;
    const past = date < today;
    const dayWord = dayWordOf(date, today);
    setSaving(true);
    try {
      const removed = entries.filter((e) => !chosen.includes(e.look.id));
      const added = chosen.filter((id) => !onDay.includes(id));
      for (const e of removed) {
        if (e.worn) await api.call('looks.unwear', { params: { id: e.look.id, date } });
        else await api.call('plan.unpin', { params: { id: e.id } });
      }
      for (const id of added) {
        if (past) await api.call('looks.wear', { params: { id }, input: { wornOn: date } });
        else await api.call('plan.pin', { params: { id }, input: { dates: [date] } });
      }
      toast.show({
        message:
          mode === 'add'
            ? copy.drawer.added(added.length, dayWord)
            : chosen.length === 0
              ? copy.drawer.cleared(dayWord)
              : past
                ? copy.drawer.worn(dayWord)
                : copy.drawer.changed(dayWord),
      });
      onChanged?.();
      onClose();
    } catch (err) {
      toast.show({ message: errorMessage(err) });
    } finally {
      setSaving(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
    }
  }

  const all = looks.data?.items ?? [];
  const filters = (q.trim() ? 1 : 0) + bands.length + wear.length;
  const wearOpts = wearForOptions(all);
  const items = pickerOrder(
    all.filter(
      (l) =>
        lookMatches(l, q) &&
        (!bands.length || bands.includes(l.climateBand as Band)) &&
        (!wear.length || lookWearFor(l).some((t) => wear.includes(t))),
    ),
    lastWornFirst,
  );
  const question = !date
    ? ''
    : date < today
      ? copy.log.past
      : date === today
        ? copy.log.today
        : copy.log.ahead;
  const cta = date
    ? drawerCta({ mode, date, today, picks: chosen.length, changed })
    : { label: '', ready: false };
  const clearRefine = () => {
    setQ('');
    setBands([]);
    setWear([]);
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      closeButton
      title={question}
      {...(date
        ? {
            eyebrow: copy.drawer.eyebrow(
              date === today ? copy.today : weekdayLong(date),
              weekdayDayMonth(date),
            ),
          }
        : {})}
      // A tall drawer (design 3k): it stands near the top whatever it holds; the grid scrolls.
      className="h-[92%]"
      testID="look-picker"
    >
      {!looks.data ? (
        <View className="flex-row gap-2.5" accessibilityState={{ busy: true }}>
          <Skeleton width="48%" aspectRatio={4 / 5} />
          <Skeleton width="48%" aspectRatio={4 / 5} />
        </View>
      ) : all.length === 0 ? (
        <View className="items-center gap-3 py-6">
          <Text className="text-center text-2xl text-ink" style={{ fontFamily: fonts.display }}>
            {copy.drawer.empty}
          </Text>
          <Text size="small" tone="muted" className="text-center">
            {copy.drawer.emptyLine}
          </Text>
          <Button
            variant="secondary"
            onPress={() => {
              onClose();
              router.push('/looks');
            }}
          >
            {copy.drawer.toLooks}
          </Button>
        </View>
      ) : (
        <>
          <View className="flex-row items-center justify-between border-hairline border-b pb-2.5">
            <Caps warm>{copy.drawer.yourLooks}</Caps>
            <View className="flex-row items-center gap-2">
              <Pill
                size="sm"
                label={`${copy.drawer.sortLabel}: ${lastWornFirst ? copy.drawer.lastWorn : copy.drawer.firstWorn}`}
                onPress={() => setLastWornFirst((v) => !v)}
              >
                {lastWornFirst ? copy.drawer.lastWorn : copy.drawer.firstWorn}
              </Pill>
              <Pill
                size="sm"
                selected={refining || filters > 0}
                onPress={() => setRefining((v) => !v)}
              >
                {filters ? copy.drawer.refineOn(filters) : copy.drawer.refine}
              </Pill>
            </View>
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerClassName="gap-3.5 pt-3.5 pb-4"
            keyboardShouldPersistTaps="handled"
          >
            {refining ? (
              <View className="gap-3.5 rounded-soft border border-hairline bg-surface-raised p-3.5">
                <View className="h-[38px] flex-row items-center gap-2 rounded-pill bg-surface-sunk px-3.5">
                  <Icon name="search" size={12} color={muted} />
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder={copy.drawer.search}
                    placeholderTextColor={faint}
                    accessibilityLabel={copy.drawer.search}
                    className="min-w-0 flex-1 py-0 text-xs"
                    style={{ fontFamily: fonts.sans, color: ink }}
                  />
                </View>
                <View className="gap-2">
                  <Caps>{copy.drawer.season}</Caps>
                  <View className="flex-row flex-wrap gap-1.5">
                    {BANDS.map((b) => (
                      <Pill
                        key={b}
                        size="sm"
                        selected={bands.includes(b)}
                        onPress={() =>
                          setBands(bands.includes(b) ? bands.filter((x) => x !== b) : [...bands, b])
                        }
                      >
                        {lookbook.refine.seasons[b]}
                      </Pill>
                    ))}
                  </View>
                </View>
                {wearOpts.length ? (
                  <View className="gap-2">
                    <Caps>{copy.drawer.wearFor}</Caps>
                    <View className="flex-row flex-wrap gap-1.5">
                      {wearOpts.map((t) => (
                        <Pill
                          key={t}
                          size="sm"
                          selected={wear.includes(t)}
                          onPress={() =>
                            setWear(wear.includes(t) ? wear.filter((x) => x !== t) : [...wear, t])
                          }
                        >
                          {t}
                        </Pill>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
            {items.length === 0 ? (
              <View className="flex-row flex-wrap items-center justify-center gap-1 py-6">
                <Text size="caption" tone="muted">
                  {copy.drawer.none}
                </Text>
                <Pressable accessibilityRole="button" onPress={clearRefine} hitSlop={8}>
                  <Text size="caption" className="underline">
                    {copy.drawer.clear}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between gap-y-2.5">
                {items.map((look) => {
                  const had = onDay.includes(look.id);
                  const on = chosen.includes(look.id);
                  return (
                    <View key={look.id} style={{ width: '48.4%' }}>
                      <LookTile
                        look={look}
                        selected={on}
                        onPress={() => toggle(look.id)}
                        meta={drawerLine(look, on, had)}
                        testID={`drawer-look-${look.id}`}
                        onImage={
                          // Every tile carries its tick: hollow until picked, the check once it is.
                          <View
                            className={`absolute top-2 right-2 size-[22px] items-center justify-center rounded-pill border ${
                              on
                                ? 'border-selected-line bg-selected'
                                : 'border-surface-raised bg-surface-raised/70'
                            }`}
                          >
                            {on ? <Icon name="check" size={12} color={ink} /> : null}
                          </View>
                        }
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
          {cta.ready ? (
            <Button loading={saving} onPress={() => void apply()}>
              {cta.label}
            </Button>
          ) : (
            // The foot waits where the button will stand, saying what a tap does.
            <View
              className="min-h-12 items-center justify-center rounded-pill border border-rule-mid px-4"
              testID="drawer-idle"
            >
              <Text size="small" tone="muted" className="text-center">
                {cta.label}
              </Text>
            </View>
          )}
        </>
      )}
    </Sheet>
  );
}
