import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { diary as copy, filters as filterCopy } from '@robes/copy';
import { weekdayDayMonth, weekdayLong } from '@robes/core/calendar';
import { lookFacets } from '@robes/core/filters';
import { pickerOrder } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import {
  Button,
  FINE_EDGE,
  fonts,
  Heading,
  Sheet,
  Skeleton,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { FilterRow } from '@/features/filters/FilterRow';
import { FilterSheet } from '@/features/filters/FilterSheet';
import { useLookFilters } from '@/features/filters/use-look-filters';
import {
  dayQuestion,
  dayWordOf,
  drawerCta,
  drawerLine,
  type PickerMode,
} from '@/features/home/diary';
import { errorMessage } from '@/lib/errors';
import { LookTile } from '../looks/LookTile';

// The Pick / Swap sheet (Front Door PRD rev 3 §4.5; design 3k): her saved looks for a day, the
// day's own looks ticked as Scheduled, the shared filter row and search under the question. From
// Pick (`add`) and from Swap on a look (`change`) alike she ticks one or several; ✓ applies. Past
// days file wears, never pins (the wear is the record); unticking takes a look off the day. One
// door for the Diary too: the day page's + Add a look. The web twin is
// app/src/app/(app)/plan/look-picker.tsx.
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
  const [sheet, setSheet] = useState(false);
  const looks = useApi('looks.list', { input: { limit: 60 } }, { enabled: open });
  const day = useApi('plan.get', { input: { from: date ?? '', days: 1 } }, { enabled: open });
  const all = useMemo(() => (looks.data?.items ?? []).map(lookFacets), [looks.data]);
  const filters = useLookFilters(all);
  const { clear } = filters;
  useEffect(() => {
    if (open) {
      setPicks(null);
      setSheet(false);
      clear();
    }
  }, [open, clear]);
  const entries: PlanEntry[] = day.data?.days[0]?.entries ?? [];
  const onDay = entries.map((e) => e.look.id);
  // The day's looks start ticked; her taps move from there. Filtering only changes what shows:
  // a look ticked before a filter hid it is still applied on ✓.
  const chosen = picks ?? onDay;
  const changed = chosen.length !== onDay.length || chosen.some((id) => !onDay.includes(id));

  const toggle = (id: string) =>
    setPicks(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);

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

  const items = pickerOrder(filters.filtered, true);
  const question = date ? dayQuestion(date, today) : '';
  const cta = date
    ? drawerCta({ mode, date, today, picks: chosen.length, changed })
    : { label: '', ready: false };
  const eyebrow = date
    ? copy.drawer.eyebrow(date === today ? copy.today : weekdayLong(date), weekdayDayMonth(date))
    : '';
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={eyebrow}
      // × · TODAY · MON 2 NOV · ✓: the ✓ is grey until her picks change the day, then ink (PRD §4.5).
      done={{
        label: cta.ready ? cta.label : copy.drawer.done,
        onPress: () => void apply(),
        disabled: !cta.ready || saving,
      }}
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
            variant="outline"
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
          <Heading size="md" className="-mt-2 mb-3.5" style={{ lineHeight: 27.6 }}>
            {question}
          </Heading>
          <FilterRow
            sheetCount={filters.sheetCount}
            onOpenSheet={() => setSheet(true)}
            seasons={filters.state.seasons}
            onRemoveSeason={filters.toggleSeason}
            quick={filters.quick}
            active={filters.state.wearFor}
            onToggle={filters.toggleWear}
            allCount={filters.allCount}
            onAll={filters.clearWear}
            testID="filter-row"
          />
          <View
            className="mt-3 h-10 flex-row items-center gap-2 rounded-pill border-rule-mid bg-surface-raised px-3.5"
            style={{ borderWidth: FINE_EDGE }}
          >
            <Icon name="search" size={13} color={muted} />
            <TextInput
              value={filters.state.query}
              onChangeText={filters.setQuery}
              placeholder={copy.drawer.search}
              placeholderTextColor={faint}
              accessibilityLabel={copy.drawer.search}
              className="min-w-0 flex-1 py-0 text-xs"
              style={{ fontFamily: fonts.sans, color: ink }}
              testID="look-search"
            />
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerClassName="gap-3.5 pt-3.5 pb-4"
            keyboardShouldPersistTaps="handled"
          >
            {items.length === 0 ? (
              <View className="flex-row flex-wrap items-center justify-center gap-1 py-6">
                <Text size="caption" tone="muted">
                  {filterCopy.noLooks}
                </Text>
                <Pressable accessibilityRole="button" onPress={filters.clear} hitSlop={8}>
                  <Text size="caption" className="underline">
                    {filterCopy.clear}
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
          <FilterSheet
            open={sheet}
            onClose={() => setSheet(false)}
            sections={[
              {
                key: 'season',
                title: filterCopy.season,
                options: filters.seasonSection,
                selected: filters.state.seasons,
                onToggle: (v) => filters.toggleSeason(v as (typeof filters.state.seasons)[number]),
              },
              {
                key: 'wear',
                title: filterCopy.wearFor,
                options: filters.wearSection,
                selected: filters.state.wearFor,
                onToggle: filters.toggleWear,
              },
            ]}
            onClear={filters.clear}
            clearable={filters.active}
            cta={filterCopy.showLooks(filters.filtered.length)}
            ctaDisabled={filters.filtered.length === 0}
            testID="filter-sheet"
          />
        </>
      )}
    </Sheet>
  );
}
