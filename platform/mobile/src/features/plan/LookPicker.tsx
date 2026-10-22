import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import { plan as copy, errors } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import { Button, Em, fonts, PrimaryScope, Sheet, Text, useColor, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LookThumb } from './LookThumb';
import { dayLabel } from './plan';

// The Add-a-look picker (legacy ff87e89, saved looks only since 2026-10-10): tap looks to tick
// them, add one or several at once; a look already on the day is shown, never offered twice.
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
  const bg = useColor('bg');
  const open = date !== null;
  const [picks, setPicks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setPicks([]);
  }, [open]);
  const looks = useApi('looks.list', { input: { limit: 60 } }, { enabled: open });
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

  const items = looks.data?.items ?? [];
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
          {looks.data && items.length === 0 ? (
            <View className="items-center gap-2 py-6">
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
            <ScrollView style={{ maxHeight: 420 }}>
              <View className="flex-row flex-wrap gap-3">
                {items.map((look) => {
                  const had = onDay.has(look.id);
                  const on = picks.includes(look.id);
                  return (
                    <Pressable
                      key={look.id}
                      accessibilityRole="button"
                      accessibilityLabel={look.name}
                      accessibilityState={{ selected: on, disabled: had }}
                      disabled={had}
                      onPress={() =>
                        setPicks((p) => (on ? p.filter((x) => x !== look.id) : [...p, look.id]))
                      }
                      style={{ width: '47%' }}
                      className={`rounded-crisp border p-1.5 ${on ? 'border-ink' : 'border-hairline'} ${had ? 'opacity-60' : ''}`}
                    >
                      <LookThumb look={look} width={140} />
                      {on ? (
                        <View className="absolute top-3 right-3 size-6 items-center justify-center rounded-pill bg-ink">
                          <Icon name="check" size={14} color={bg} />
                        </View>
                      ) : null}
                      <Text
                        numberOfLines={1}
                        className="mt-2"
                        style={{ fontFamily: fonts.displayRegular }}
                      >
                        {look.name}
                      </Text>
                      <Text size="caption" tone="muted" numberOfLines={1}>
                        {had
                          ? copy.picker.already
                          : look.lastWornOn
                            ? copy.picker.lastWorn(dayLabel(look.lastWornOn))
                            : copy.picker.neverWorn}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
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
              <Text size="small" tone="muted" className="text-center">
                {copy.picker.hint}
              </Text>
            )
          ) : null}
        </View>
      </PrimaryScope>
    </Sheet>
  );
}
