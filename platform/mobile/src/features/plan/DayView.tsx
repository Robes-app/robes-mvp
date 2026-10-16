import type { PlanEntry } from '@robes/contracts';
import { plan as copy } from '@robes/copy';
import { daySummary, longDate } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import { Eyebrow, fonts, IconButton, Skeleton, Text, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { localDate } from '../looks/saved-looks';
import { LookPicker } from './LookPicker';
import { LookThumb } from './LookThumb';
import { usePlanDay, useUnpin, useUpdateEntry } from './plan';

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
  const update = useUpdateEntry();
  const [picking, setPicking] = useState(false);
  const [naming, setNaming] = useState(false);
  const entries = query.data?.days[0]?.entries ?? [];
  const s = daySummary(entries);
  const words = entries.find((e) => e.activity?.trim())?.activity?.trim() ?? '';
  const [draft, setDraft] = useState('');

  function commit() {
    setNaming(false);
    const next = draft.trim() || null;
    if ((next ?? '') === words) return;
    // The day's name is what's on that day: every look on it carries it.
    for (const e of entries) update.mutate({ params: { id: e.id }, input: { activity: next } });
  }

  const section =
    date === today ? copy.day.filedToday : date < today ? copy.day.filed : copy.day.planned;

  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12" testID="day-page">
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
              className="min-h-11 flex-1 border-b border-border-control text-3xl text-ink italic"
              style={{ fontFamily: fonts.displayRegular }}
            />
          ) : (
            <Text
              accessibilityRole="header"
              className={`flex-1 text-3xl italic ${s.name ? 'text-ink' : 'text-ink-faint'}`}
              style={{ fontFamily: fonts.displayRegular }}
            >
              {s.name ?? copy.day.name}
            </Text>
          )}
          {/* A day takes a name once a look is on it: the name rides on its looks. */}
          {!naming && entries.length ? (
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

      {query.isError ? <Text tone="danger">{errorMessage(query.error)}</Text> : null}
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
              <Text size="caption" tone="muted">
                {entries.length ? copy.day.addAnotherHint : copy.day.chooseHint}
              </Text>
            </View>
            {entries.length ? null : <Icon name="forward" size={16} color={ink} />}
          </Pressable>
        </View>
      )}
      <LookPicker date={picking ? date : null} title={s.name} onClose={() => setPicking(false)} />
    </ScrollView>
  );
}
