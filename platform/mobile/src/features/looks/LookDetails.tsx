import type { Look } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { dayMonth } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import { FINE_EDGE, fonts, MIN_TOUCH, Text, typeStyle, useColor } from '@robes/ui-native';
import { type ComponentRef, type ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

const copy = lookbook.savedLook.details;
const seasonNames = lookbook.savedLook.seasonsView.names;

// The summary each row shows, built from the same words on both platforms (web look-details.tsx).
export function detailSummaries(look: Look): {
  tags: string | null;
  seasons: string | null;
  worn: string | null;
} {
  const last = look.timesWorn && look.lastWornOn ? dayMonth(look.lastWornOn) : null;
  return {
    tags: look.tags.length ? look.tags.join(' · ') : null,
    seasons: look.seasons.length ? look.seasons.map((s) => seasonNames[s]).join(' · ') : null,
    worn: look.timesWorn ? copy.wornSummary(look.timesWorn, last) : null,
  };
}

// One drill row: a 9pt tracked label, the summary (faint when empty), a 14pt chevron.
function Row({
  label,
  summary,
  empty,
  muted = false,
  onOpen,
  children,
  first = false,
  testID,
}: {
  label: string;
  summary: string | null;
  empty: string;
  muted?: boolean;
  onOpen: () => void;
  children?: ReactNode;
  first?: boolean;
  testID?: string;
}) {
  const faint = useColor('ink-faint');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} · ${summary ?? empty}`}
      onPress={onOpen}
      testID={testID}
      className="flex-row items-center gap-3 border-hairline pr-3 pl-4"
      style={{ height: 48, minHeight: MIN_TOUCH, borderTopWidth: first ? 0 : FINE_EDGE }}
    >
      <Text className="text-ink-muted" style={typeStyle('label')}>
        {label}
      </Text>
      <View className="flex-1 flex-row items-center justify-end gap-3">
        {children ?? (
          <Text
            numberOfLines={1}
            className={summary && !muted ? 'text-ink-muted' : 'text-ink-faint'}
            style={{ fontSize: 11 }}
          >
            {summary ?? empty}
          </Text>
        )}
      </View>
      <Icon name="forward" size={14} color={faint} />
    </Pressable>
  );
}

// Felix's LookDetails (3e Details): Tags, Seasons, Worn and Caption as one drill-down card on
// `white` with a 0.5pt `rule-mid` edge and 48pt rows. The caption edits inline on a `warm-line`
// underline; Return or blur keeps it. Web twin: app/src/components/looks/look-details.tsx.
export function LookDetails({
  look,
  onTags,
  onSeasons,
  onWorn,
  onCaption,
}: {
  look: Look;
  onTags: () => void;
  onSeasons: () => void;
  // A draft has no Worn row (D14): leave it out.
  onWorn?: () => void;
  onCaption: (caption: string | null) => void;
}) {
  const summary = detailSummaries(look);
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');
  const line = useColor('selected-line');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(look.note ?? '');
  const field = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);
  const keep = () => {
    setEditing(false);
    const next = draft.trim() || null;
    if (next !== (look.note ?? null)) onCaption(next);
  };
  return (
    <View
      testID="look-details"
      className="overflow-hidden rounded-soft border-rule-mid bg-surface-raised"
      style={{ borderWidth: FINE_EDGE }}
    >
      <Row
        label={copy.tags}
        summary={summary.tags}
        empty={copy.none}
        onOpen={onTags}
        first
        testID="details-tags"
      />
      <Row
        label={copy.seasons}
        summary={summary.seasons}
        empty={copy.yearRound}
        onOpen={onSeasons}
        testID="details-seasons"
      >
        {look.seasons.length ? (
          <View className="flex-row items-center gap-1.5">
            {look.seasons.map((s) => (
              <View key={s} className="flex-row items-center gap-1.5">
                <Icon name={s} size={12} color={muted} />
                {look.seasons.length > 2 ? null : (
                  <Text className="text-ink-muted" style={{ fontSize: 11 }}>
                    {seasonNames[s]}
                  </Text>
                )}
              </View>
            ))}
          </View>
        ) : null}
      </Row>
      {onWorn ? (
        <Row
          label={copy.worn}
          summary={summary.worn}
          empty={copy.notWorn}
          muted
          onOpen={onWorn}
          testID="details-worn"
        />
      ) : null}
      {editing ? (
        <View
          className="flex-row items-center gap-3 border-hairline pl-4"
          style={{ height: 48, paddingVertical: 7, paddingRight: 7, borderTopWidth: FINE_EDGE }}
        >
          <Text className="text-ink-muted" style={typeStyle('label')}>
            {copy.caption}
          </Text>
          <TextInput
            ref={field}
            accessibilityLabel={copy.caption}
            value={draft}
            onChangeText={setDraft}
            onBlur={keep}
            onSubmitEditing={keep}
            returnKeyType="done"
            maxLength={2000}
            placeholder={copy.captionPlaceholder}
            placeholderTextColor={faint}
            className="flex-1 text-right"
            style={{
              height: 26,
              fontFamily: fonts.sansRegular,
              fontSize: 11,
              color: ink,
              borderBottomWidth: FINE_EDGE,
              borderBottomColor: line,
              paddingVertical: 0,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.clearCaption}
            disabled={!draft}
            onPress={() => setDraft('')}
            className="items-center justify-center rounded-pill"
            style={{ width: 32, height: 32, marginHorizontal: -4, opacity: draft ? 1 : 0.35 }}
          >
            <Icon name="close" size={14} color={muted} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.editCaption}
          onPress={() => {
            setDraft(look.note ?? '');
            setEditing(true);
          }}
          testID="details-caption"
          className="flex-row items-center gap-3 border-hairline pr-3 pl-4"
          style={{ height: 48, borderTopWidth: FINE_EDGE }}
        >
          <Text className="text-ink-muted" style={typeStyle('label')}>
            {copy.caption}
          </Text>
          <Text
            numberOfLines={1}
            className={`flex-1 text-right ${look.note ? 'text-ink-muted' : 'text-ink-faint'}`}
            style={{ fontSize: 11 }}
          >
            {look.note ?? copy.captionPlaceholder}
          </Text>
          <View
            className="items-center justify-center"
            style={{ width: 32, height: 32, marginHorizontal: -4 }}
          >
            <Icon name="pencil" size={14} color={ink} />
          </View>
        </Pressable>
      )}
    </View>
  );
}
