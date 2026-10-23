import { useApi } from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { plan as copy } from '@robes/copy';
import { daySummary, longDate } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import { ErrorText, Eyebrow, fonts, IconButton, Skeleton, Text, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { localDate } from '../looks/saved-looks';
import { LookPicker } from './LookPicker';
import { LookThumb } from './LookThumb';
import { useNameDay, usePlanDay, useUnpin } from './plan';

function LookCard({ entry, n }: { entry: PlanEntry; n: number }) {
  const router = useRouter();
  const unpin = useUnpin();
  return (
    <View style={{ width: '47%' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={entry.look.name}
        onPress={() => router.push(`/look/${entry.look.id}`)}
        className="gap-1.5"
      >
        <LookThumb look={entry.look} width={160} />
        <Text
          className="text-[9px] text-ink-faint uppercase"
          style={{ fontFamily: fonts.sans, letterSpacing: 1.6 }}
        >
          {copy.day.lookEyebrow(n)}
        </Text>
        <Text className="text-xl text-ink" style={{ fontFamily: fonts.displayRegular }}>
          {entry.look.name}
        </Text>
        <Text size="caption" tone="muted">
          {copy.list.pieces(entry.look.pieces.length)}
        </Text>
      </Pressable>
      <View className="absolute top-1 right-1 rounded-pill bg-bg">
        <IconButton
          icon="close"
          tone="ink-muted"
          label={copy.day.remove(entry.look.name)}
          onPress={() => unpin.mutate({ params: { id: entry.id } })}
        />
      </View>
    </View>
  );
}

// The day page (legacy ff87e89): the date as eyebrow, her name for the day with the pencil, the
// looks on it, and the door to add one or several.
export function DayView({ date }: { date: string }) {
  const muted = useColor('ink-muted');
  const ink = useColor('ink');
  const today = localDate();
  const query = usePlanDay(date);
  const nameDay = useNameDay();
  const [picking, setPicking] = useState(false);
  const [naming, setNaming] = useState(false);
  const entries = query.data?.days[0]?.entries ?? [];
  const dayName = query.data?.days[0]?.name ?? null;
  const s = daySummary(entries, dayName);
  const words = dayName ?? entries.find((e) => e.activity?.trim())?.activity?.trim() ?? '';
  const [draft, setDraft] = useState('');
  const router = useRouter();
  const ahead = date >= today;
  const weather = useApi(
    'today.weather',
    { input: { date } },
    { enabled: ahead, staleTime: 3_600_000 },
  );
  const wx = ahead ? weather.data : null;

  function commit() {
    setNaming(false);
    const next = draft.trim() || null;
    if ((next ?? '') === words) return;
    nameDay.mutate({ params: { date }, input: { name: next } });
  }

  const section =
    date === today ? copy.day.filedToday : date < today ? copy.day.filed : copy.day.planned;

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-6 px-6 pb-28" testID="day-page">
        <View className="gap-2">
          <Eyebrow>{longDate(date)}</Eyebrow>
          <View className="flex-row items-center gap-2">
            {naming ? (
              <TextInput
                autoFocus
                accessibilityLabel={copy.day.nameLabel}
                value={draft}
                onChangeText={setDraft}
                maxLength={120}
                placeholder={copy.day.name}
                returnKeyType="done"
                onSubmitEditing={commit}
                onBlur={commit}
                className="min-h-11 flex-1 border-b border-border-control text-3xl text-ink"
                style={{ fontFamily: fonts.displayRegularItalic }}
              />
            ) : (
              <Text
                accessibilityRole="header"
                className={`flex-1 text-3xl ${s.name ? 'text-ink' : 'text-ink-faint'}`}
                style={{ fontFamily: fonts.displayRegularItalic }}
              >
                {s.name ?? copy.day.name}
              </Text>
            )}
            {/* Any day can be named, so she can plan a week before adding outfits. */}
            {!naming ? (
              <IconButton
                icon="pencil"
                tone="ink-muted"
                label={s.name ? copy.day.rename : copy.day.name}
                onPress={() => {
                  setDraft(words);
                  setNaming(true);
                }}
              />
            ) : null}
          </View>
          {wx ? (
            <View className="gap-1" accessibilityLabel={copy.day.weatherLabel}>
              <Text
                size="caption"
                tone="muted"
                weight="medium"
                className="uppercase"
                style={{ letterSpacing: 1.6 }}
              >
                {[wx.city, wx.condition, wx.tempRange].filter(Boolean).join(' · ')}
              </Text>
              <Text size="small" tone="muted" italic>
                {copy.day.advice(wx.condition, wx.tempRange)}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="flex-row items-baseline justify-between border-b border-hairline pb-2">
          <Text
            className="text-[10px] text-ink-faint uppercase"
            style={{ fontFamily: fonts.sans, letterSpacing: 2.4 }}
          >
            {section}
          </Text>
          <Text size="caption" tone="muted">
            {s.looks ? copy.day.stat(s.looks, s.pieces) : ''}
          </Text>
        </View>

        {query.isError ? <ErrorText>{errorMessage(query.error)}</ErrorText> : null}
        {query.isPending ? (
          <View className="flex-row gap-3" accessibilityState={{ busy: true }}>
            <Skeleton width="47%" aspectRatio={4 / 5} />
            <Skeleton width="47%" aspectRatio={4 / 5} />
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-4">
            {entries.map((entry, i) => (
              <LookCard key={entry.id} entry={entry} n={i + 1} />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={entries.length ? copy.day.addAnother : copy.day.choose}
              accessibilityHint={entries.length ? copy.day.addAnotherHint : copy.day.chooseHint}
              onPress={() => setPicking(true)}
              style={entries.length ? { width: '47%', aspectRatio: 4 / 5 } : { width: '100%' }}
              className={`rounded-crisp border border-dashed border-border-control p-4 ${
                entries.length ? 'items-center justify-center gap-2' : 'flex-row items-center gap-4'
              }`}
            >
              <Icon name={entries.length ? 'plus' : 'looks'} size={20} color={muted} />
              <View className={entries.length ? 'items-center' : 'flex-1'}>
                <Text className="text-lg text-ink" style={{ fontFamily: fonts.displayRegular }}>
                  {entries.length ? copy.day.addAnother : copy.day.choose}
                </Text>
                <Text size="caption" tone="faint" italic>
                  {entries.length ? copy.day.addAnotherHint : copy.day.chooseHint}
                </Text>
              </View>
              {entries.length ? null : <Icon name="forward" size={16} color={ink} />}
            </Pressable>
          </View>
        )}
        <LookPicker date={picking ? date : null} title={s.name} onClose={() => setPicking(false)} />
      </ScrollView>
      {ahead ? (
        // Beta's floating door: a new look for this day, from the box on Today.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.day.dress}
          onPress={() => router.push({ pathname: '/', params: { dress: date } })}
          className="absolute right-4 bottom-6 min-h-11 flex-row items-center gap-2 rounded-pill border border-border-control bg-bg px-5"
          testID="dress-this-day"
        >
          <Icon name="looks" size={18} color={ink} />
          <Text className="text-lg text-ink" style={{ fontFamily: fonts.displayItalic }}>
            {copy.day.dress}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
