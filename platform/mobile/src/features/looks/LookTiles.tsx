import type { Look } from '@robes/contracts';
import { lookbook as copy, filters } from '@robes/copy';
import { startedLabel } from '@robes/core/looks';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { type Aspect, MIN_TOUCH, useColor } from '@robes/ui-native';
import { Link } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { LookTile } from './LookTile';
import { Scanning, scanningLine } from './ScanLine';
import { localDate } from './saved-looks';

// A control on the photograph: drawn small (32pt ✕, 36pt calendar — beta's size, not a large
// white disc) with the hit area reaching out to 44pt.
export function OnPhoto({
  icon,
  label,
  size,
  onPress,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  size: 32 | 36;
  onPress: () => void;
  disabled?: boolean;
}) {
  const ink = useColor('ink');
  const slop = (MIN_TOUCH - size) / 2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={slop}
      style={{ width: size, height: size }}
      className={`items-center justify-center rounded-pill bg-bg ${disabled ? 'opacity-50' : ''}`}
    >
      <Icon name={icon} size={size === 32 ? 14 : 16} color={ink} />
    </Pressable>
  );
}

// The Lookbook card's line (Front Door PRD rev 3 §5.2): the wears or New, then its seasons, Year
// round when it carries none; a bag marks a look with pieces still to find. Twin of look-tiles.tsx.
export function cardMeta(look: Look): string {
  return copy.meta.frontDoor(
    look.timesWorn,
    look.seasons.map((s) => filters.seasons[s]),
    filters.seasons.year_round,
  );
}

// Saved: no eyebrow (the default state needs no label). The calendar sits ON the image bottom
// left — the look's own diary door, so a day is set without leaving the grid (legacy 13 Oct) —
// and ✕ deletes, top right, as on a suggestion.
export function SavedTile({
  look,
  aspect,
  onPress,
  onDiary,
  onDelete,
}: {
  look: Look;
  aspect?: Aspect;
  onPress?: () => void;
  onDiary?: () => void;
  onDelete?: () => void;
}) {
  return (
    <LookTile
      look={look}
      {...(onPress ? { onPress } : {})}
      {...(aspect ? { aspect } : {})}
      className="flex-1"
      metaIcon="calendar"
      meta={cardMeta(look)}
      mark={look.proposals.length ? { icon: 'shop', label: copy.card.shop } : null}
      onImage={
        onDiary ? (
          <View className="absolute bottom-2 left-2">
            <OnPhoto icon="plan" label={copy.card.diary} size={36} onPress={onDiary} />
          </View>
        ) : null
      }
      corner={
        onDelete ? (
          <OnPhoto icon="close" label={copy.card.delete} size={32} onPress={onDelete} />
        ) : null
      }
    />
  );
}

// The Lookbook's saved card on iOS: a tap opens the look, a long press peeks at it with the native
// menu (Schedule look · Delete look), so the card carries no × at rest (Front Door 2b). Delete
// keeps its Undo toast. Elsewhere it is the SavedTile with its ✕.
export function SavedLookCard({
  look,
  aspect,
  onPress,
  onDiary,
  onDelete,
}: {
  look: Look;
  aspect?: Aspect;
  onPress: () => void;
  onDiary: () => void;
  onDelete: () => void;
}) {
  if (Platform.OS !== 'ios') {
    return (
      // No calendar on the photo in the Lookbook (Annie, 15 Nov): she schedules from the look.
      <SavedTile
        look={look}
        onPress={onPress}
        onDelete={onDelete}
        {...(aspect ? { aspect } : {})}
      />
    );
  }
  return (
    <Link href={`/look/${look.id}`} asChild>
      <Link.Trigger>
        <Pressable accessibilityRole="button" accessibilityLabel={look.name} className="flex-1">
          {/* No calendar on the photo (Annie, 15 Nov): Schedule is in the menu and on the look. */}
          <SavedTile look={look} {...(aspect ? { aspect } : {})} />
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        <Link.MenuAction icon="calendar" onPress={onDiary}>
          {copy.card.menu.schedule}
        </Link.MenuAction>
        <Link.MenuAction icon="trash" destructive onPress={onDelete}>
          {copy.card.menu.delete}
        </Link.MenuAction>
      </Link.Menu>
    </Link>
  );
}

// Draft: the same tile, dashed and small — a look, unfinished, in the In progress row.
export function DraftTile({ look, onPress }: { look: Look; onPress: () => void }) {
  const name = look.nameProvisional ? copy.draftTile.untitled : look.name;
  return (
    <LookTile
      look={look}
      onPress={onPress}
      // Beta's In progress tile is 140 wide (twin: look-tiles.tsx).
      width={140}
      dashed
      eyebrow={copy.draftTile.eyebrow}
      eyebrowTone="warm"
      name={name}
      italic={look.nameProvisional}
      label={`${copy.draftTile.eyebrow}: ${name}`}
      meta={copy.draftTile.meta(startedLabel(look.createdAt, localDate()))}
      testID={`draft-${look.id}`}
    />
  );
}

// Suggested (design "Suggested looks", 23 Nov): a Lookbook card signed by Robes — the photograph,
// the name, Suggested by Robes, and nothing on the photograph. A tap opens the look; on iOS a long
// press peeks at it with the native menu (Save look · Delete look), as on a saved card. Web twin:
// look-tiles.tsx SuggestedTile.
export function SuggestedTile({
  look,
  onPress,
  onSave,
  onDelete,
  aspect,
}: {
  look: Look;
  onPress: () => void;
  onSave: () => void;
  onDelete: () => void;
  aspect?: Aspect;
}) {
  const busy = scanningLine(look);
  const tile = (press?: () => void) => (
    <LookTile
      look={look}
      {...(press ? { onPress: press } : {})}
      {...(aspect ? { aspect } : {})}
      className="flex-1"
      label={copy.suggestedTile.label(look.name)}
      signed={copy.suggestedTile.by}
      testID={`suggested-${look.id}`}
      onImage={busy ? <Scanning line={busy} /> : null}
    />
  );
  if (Platform.OS !== 'ios') return tile(onPress);
  return (
    <Link href={`/look/${look.id}`} asChild>
      <Link.Trigger>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.suggestedTile.label(look.name)}
          className="flex-1"
        >
          {tile()}
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        <Link.MenuAction icon="bookmark" onPress={onSave}>
          {copy.suggestedTile.menu.save}
        </Link.MenuAction>
        <Link.MenuAction icon="trash" destructive onPress={onDelete}>
          {copy.suggestedTile.menu.delete}
        </Link.MenuAction>
      </Link.Menu>
    </Link>
  );
}
