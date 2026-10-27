import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { plan as copy, errors, lookbook } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { lookMatches, pickerOrder } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import {
  Button,
  Em,
  fonts,
  Pill,
  PrimaryScope,
  Sheet,
  Text,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { LookTile } from '../looks/LookTile';
import { dayLabel } from './plan';

// The Add-a-look picker (legacy ff87e89, saved looks only since 2026-10-10): tap looks to tick
// them, add one or several at once; a look already on the day is shown, never offered twice.
// The web twin is app/(app)/plan/look-picker.tsx.
const BANDS = ['spring_summer', 'autumn_winter', 'year_round'] as const;
type Band = (typeof BANDS)[number];

export function LookPicker({
  date,
  title,
  onClose,
}: {
  date: string | null;
  title?: string | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const muted = useColor('ink-muted');
  const ink = useColor('ink');
  const faint = useColor('ink-faint');
  const open = date !== null;
  const [picks, setPicks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastWornFirst, setLastWornFirst] = useState(true);
  const [refining, setRefining] = useState(false);
  const [q, setQ] = useState('');
  const [bands, setBands] = useState<Band[]>([]);
  useEffect(() => {
    if (open) {
      setPicks([]);
      setRefining(false);
      setQ('');
      setBands([]);
    }
  }, [open]);
  const looks = useApi('looks.list', { input: { limit: 60 } }, { enabled: open });
  // A day takes saved looks only; the ones still waiting in Suggested are named, one tap away.
  const suggested = useApi(
    'looks.list',
    { input: { limit: 60, status: 'suggested' } },
    { enabled: open },
  );
  const day = useApi('plan.get', { input: { from: date ?? '', days: 1 } }, { enabled: open });
  const onDay = new Set(day.data?.days[0]?.entries.map((e) => e.look.id) ?? []);
  const pin = useApiMutation('plan.pin');

  async function add() {
    if (!date || picks.length === 0) return;
    setSaving(true);
    try {
      for (const id of picks) await pin.mutateAsync({ params: { id }, input: { dates: [date] } });
      toast.show({ message: copy.picker.added(picks.length, weekdayLong(date)) });
      onClose();
    } catch {
      toast.show({ message: errors.internal });
    } finally {
      setSaving(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });
    }
  }

  const all = looks.data?.items ?? [];
  const filters = (q.trim() ? 1 : 0) + bands.length;
  const items = pickerOrder(
    all.filter(
      (l) => lookMatches(l, q) && (!bands.length || bands.includes(l.climateBand as Band)),
    ),
    lastWornFirst,
  );
  const suggN = suggested.data?.items.length ?? 0;
  const suggLine = suggN ? (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={copy.picker.suggested(suggN)}
      onPress={() => {
        onClose();
        router.push({ pathname: '/looks', params: { tab: 'suggested' } });
      }}
      className="min-h-11 flex-row items-center justify-between gap-3 rounded-soft border border-hairline bg-surface-raised px-4 py-3"
    >
      <Text size="small" tone="muted" className="flex-1">
        {copy.picker.suggested(suggN)}
      </Text>
      <Icon name="forward" size={14} color={muted} />
    </Pressable>
  ) : null;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title || copy.picker.title}
      {...(date ? { eyebrow: copy.picker.eyebrow(dayLabel(date)) } : {})}
      testID="look-picker"
    >
      <PrimaryScope>
        <View className="gap-4">
          {looks.data && all.length === 0 ? (
            <View className="items-center gap-2 py-6">
              {suggLine}
              <Text style={{ fontFamily: fonts.display }} className="text-2xl text-ink">
                {copy.picker.emptyTitle} <Em>{copy.picker.emptyTitleEm}</Em>
              </Text>
              <Text tone="muted" className="text-center">
                {copy.picker.emptyBody}
              </Text>
              <Button
                variant="secondary"
                onPress={() => {
                  onClose();
                  router.push('/looks');
                }}
              >
                {copy.picker.toLooks}
              </Button>
            </View>
          ) : (
            <View className="gap-3">
              {suggLine}
              <View className="flex-row flex-wrap items-center gap-2 border-b border-hairline pb-3">
                <Text
                  className="text-[10px] text-ink-faint uppercase"
                  style={{ fontFamily: fonts.sans, letterSpacing: 2.4 }}
                >
                  {copy.picker.yourLooks}
                </Text>
                <Text
                  className="text-sm text-ink-faint"
                  style={{ fontFamily: fonts.displayItalic }}
                >
                  {copy.list.looks(all.length)}
                </Text>
                <View className="ml-auto flex-row gap-[6px]">
                  <Pill onPress={() => setLastWornFirst((v) => !v)}>
                    {lastWornFirst ? copy.picker.lastWornFirst : copy.picker.firstWornFirst}
                  </Pill>
                  <Pill selected={refining || filters > 0} onPress={() => setRefining((v) => !v)}>
                    {filters ? copy.picker.refineOn(filters) : copy.picker.refine}
                  </Pill>
                </View>
              </View>
              {refining ? (
                <View className="gap-3 rounded-soft border border-hairline bg-surface-raised p-3">
                  <TextInput
                    value={q}
                    onChangeText={setQ}
                    placeholder={copy.picker.search}
                    placeholderTextColor={faint}
                    accessibilityLabel={copy.picker.search}
                    className="min-h-11 rounded-pill border border-rule-mid bg-surface-raised px-4 text-sm"
                    style={{ fontFamily: fonts.sans, color: ink }}
                  />
                  <Text
                    className="text-[10px] text-accent-warm uppercase"
                    style={{ fontFamily: fonts.sans, letterSpacing: 1.8 }}
                  >
                    {lookbook.refine.season}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {BANDS.map((b) => (
                      <Pill
                        key={b}
                        selected={bands.includes(b)}
                        onPress={() =>
                          setBands(bands.includes(b) ? bands.filter((x) => x !== b) : [...bands, b])
                        }
                      >
                        {lookbook.refine.seasons[b]}
                      </Pill>
                    ))}
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Button
                      variant="quiet"
                      disabled={!filters}
                      onPress={() => {
                        setQ('');
                        setBands([]);
                      }}
                    >
                      {copy.picker.clear}
                    </Button>
                    <Text
                      className="text-sm text-ink-faint"
                      style={{ fontFamily: fonts.displayItalic }}
                    >
                      {copy.list.looks(items.length)}
                    </Text>
                  </View>
                </View>
              ) : null}
              {items.length === 0 ? (
                <View className="items-center gap-1 py-6">
                  <Text className="text-xl text-ink" style={{ fontFamily: fonts.displayRegular }}>
                    {copy.picker.noneTitle}
                  </Text>
                  <Text size="small" tone="muted" className="text-center">
                    {copy.picker.noneBody}
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 420 }}>
                  <View className="flex-row flex-wrap gap-3">
                    {items.map((look) => {
                      const had = onDay.has(look.id);
                      const on = picks.includes(look.id);
                      return (
                        <LookTile
                          key={look.id}
                          look={look}
                          className="w-[47%]"
                          selected={on}
                          dimmed={had}
                          disabled={had}
                          onPress={() =>
                            setPicks((p) => (on ? p.filter((x) => x !== look.id) : [...p, look.id]))
                          }
                          meta={
                            had
                              ? copy.picker.already
                              : look.lastWornOn
                                ? copy.picker.lastWorn(dayLabel(look.lastWornOn))
                                : copy.picker.neverWorn
                          }
                          onImage={
                            had ? null : (
                              // Every tile carries its tick: hollow until picked, the check once it is.
                              <View
                                className={`absolute top-2 right-2 size-6 items-center justify-center rounded-pill border bg-surface-raised ${
                                  on ? 'border-selected-line' : 'border-rule-mid'
                                }`}
                              >
                                {on ? <Icon name="check" size={14} color={ink} /> : null}
                              </View>
                            )
                          }
                        />
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>
          )}
          {items.length ? (
            picks.length ? (
              <Button
                onPress={() => void add()}
                loading={saving}
                loadingLabel={copy.picker.add(picks.length)}
              >
                {copy.picker.add(picks.length)}
              </Button>
            ) : (
              // Beta's foot: the hint waits in the place the Add button will take.
              <View className="min-h-12 items-center justify-center rounded-pill border border-rule-mid px-4">
                <Text size="small" tone="muted" className="text-center">
                  {copy.picker.hint}
                </Text>
              </View>
            )
          ) : null}
        </View>
      </PrimaryScope>
    </Sheet>
  );
}
