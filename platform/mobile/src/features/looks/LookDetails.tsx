import type { Look } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import { dayMonth } from '@robes/core/calendar';
import { Icon } from '@robes/icons/native';
import { DrillList, DrillRow, FINE_EDGE, fonts, Text, typeStyle, useColor } from '@robes/ui-native';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
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

// Felix's LookDetails (3e Details): Tags, Seasons, Worn and Caption as one drill-down card — the
// shared DrillList, with SettingsView. The caption edits inline on a `warm-line` underline; Return
// or blur keeps it. Web twin: app/src/components/looks/look-details.tsx.
export function LookDetails({
  look,
  onTags,
  onSeasons,
  onWorn,
  onCaption,
  photos,
}: {
  look: Look;
  onTags: () => void;
  onSeasons: () => void;
  // A draft has no Worn row (D14): leave it out.
  onWorn?: () => void;
  // The Caption is the look's name (D16): empty or unchanged keeps the name it had.
  onCaption: (name: string) => void;
  // A saved look's images, counted; the row opens the photo strip (Capture PRD 3.1).
  photos?: { count: number; onOpen: () => void };
}) {
  const summary = detailSummaries(look);
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');
  const line = useColor('selected-line');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(look.name);
  const field = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => {
    if (editing) field.current?.focus();
  }, [editing]);
  const keep = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== look.name) onCaption(next);
  };
  return (
    <DrillList testID="look-details">
      {photos ? (
        <DrillRow
          label={copy.photos}
          value={String(photos.count)}
          onPress={photos.onOpen}
          first
          testID="details-photos"
        />
      ) : null}
      <DrillRow
        label={copy.tags}
        value={summary.tags ?? copy.none}
        muted={!summary.tags}
        onPress={onTags}
        {...(photos ? {} : { first: true })}
        testID="details-tags"
      />
      <DrillRow
        label={copy.seasons}
        value={summary.seasons ?? copy.yearRound}
        muted={!summary.seasons}
        onPress={onSeasons}
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
        ) : undefined}
      </DrillRow>
      {onWorn ? (
        <DrillRow
          label={copy.worn}
          value={summary.worn ?? copy.notWorn}
          muted
          onPress={onWorn}
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
            maxLength={120}
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
        <DrillRow
          label={copy.caption}
          value={look.name}
          accessibilityLabel={copy.editCaption}
          onPress={() => {
            setDraft(look.name);
            setEditing(true);
          }}
          testID="details-caption"
          trailing={
            <View
              className="items-center justify-center"
              style={{ width: 32, height: 32, marginHorizontal: -4 }}
            >
              <Icon name="pencil" size={14} color={ink} />
            </View>
          }
        />
      )}
    </DrillList>
  );
}
