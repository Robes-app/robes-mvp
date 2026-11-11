import type { Look } from '@robes/contracts';
import { lookbook as copy, filters } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { anchorName, startedLabel, suggestionReason } from '@robes/core/looks';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { type Aspect, fonts, Image, MIN_TOUCH, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { renditionUri } from '@/lib/images';
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

// Why Robes suggested a look, as the card's line (PRD §5.3).
export function reasonLine(look: Look): string {
  const reason = suggestionReason(look);
  switch (reason.kind) {
    case 'anchor':
      return copy.suggestedTile.around(reason.piece);
    case 'day':
      return copy.suggestedTile.reason.day(weekdayLong(reason.date));
    case 'wishlist':
      return copy.suggestedTile.reason.wishlist;
    case 'own':
      return copy.suggestedTile.reason.own(reason.pieces);
    case 'wearMost':
      return copy.suggestedTile.reason.wearMost;
    default:
      return copy.suggestedTile.fromPrompt;
  }
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
  onPress: () => void;
  onDiary?: () => void;
  onDelete?: () => void;
}) {
  return (
    <LookTile
      look={look}
      onPress={onPress}
      {...(aspect ? { aspect } : {})}
      className="flex-1"
      metaIcon="calendar"
      meta={cardMeta(look)}
      mark={look.proposals.length ? { icon: 'bag', label: copy.card.shop } : null}
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

// Bottom left of a suggestion says where it came from (legacy _lkSuggCard): the piece it was
// styled around — its photograph, or its initial — and a tap opens the piece; a look styled
// from her own words wears a rose open-quote instead.
function SuggestedMark({ look }: { look: Look }) {
  const router = useRouter();
  const rose = useColor('accent-inspire');
  const anchor = look.anchor;
  const frame = 'absolute bottom-2 left-2 overflow-hidden rounded-crisp border-2 border-bg';
  if (!anchor) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID={`suggested-${look.id}-quote`}
        className={`${frame} items-center justify-center bg-surface`}
        style={{ width: 36, height: 44 }}
      >
        <Text style={{ fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: rose }}>
          {copy.suggestedTile.quote}
        </Text>
      </View>
    );
  }
  const name = anchorName(anchor.label, anchor.brand);
  const uri = renditionUri(anchor.image, 36);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.suggestedTile.yourPiece(name)}
      onPress={() => router.push(`/piece/${anchor.id}`)}
      hitSlop={4}
      className={`${frame} items-center justify-center bg-surface`}
      style={{ width: 36, height: 44 }}
      testID={`suggested-${look.id}-mark`}
    >
      {uri ? (
        <Image source={uri} alt="" aspect="4:5" />
      ) : (
        <Text className="text-ink" style={{ fontFamily: fonts.display, fontSize: 18 }}>
          {name.charAt(0).toLocaleUpperCase()}
        </Text>
      )}
    </Pressable>
  );
}

// Suggested: Robes' frame, why it was suggested under the name, where it came from in the corner,
// the bookmark that saves it on the photograph (PRD §5.3), ✕ and ↻ always shown.
export function SuggestedTile({
  look,
  onPress,
  onRemove,
  onSwap,
  onSave,
  saving = false,
  swapping,
  showMark = true,
  aspect,
}: {
  look: Look;
  onPress: () => void;
  onRemove: () => void;
  onSwap: () => void;
  onSave?: () => void;
  saving?: boolean;
  swapping: boolean;
  showMark?: boolean;
  aspect?: Aspect;
}) {
  const busy = scanningLine(look, swapping);
  return (
    <LookTile
      look={look}
      onPress={onPress}
      {...(aspect ? { aspect } : {})}
      className="flex-1"
      eyebrow={copy.suggestedTile.eyebrow}
      eyebrowTone="warm"
      meta={reasonLine(look)}
      mark={look.proposals.length ? { icon: 'bag', label: copy.card.shop } : null}
      testID={`suggested-${look.id}`}
      onImage={
        <>
          {busy ? <Scanning line={busy} /> : null}
          {showMark ? <SuggestedMark look={look} /> : null}
          {onSave ? (
            <View className="absolute right-2 bottom-2">
              <OnPhoto
                icon="bookmark"
                label={copy.suggestedTile.save(look.name)}
                size={32}
                onPress={onSave}
                disabled={saving}
              />
            </View>
          ) : null}
        </>
      }
      corner={
        <View className="flex-row gap-[6px]">
          {/* Beta's order: ↻ then ✕, the way out at the edge (twin: look-tiles.tsx). */}
          <OnPhoto
            icon="swap"
            label={copy.suggestedTile.swap(look.name)}
            size={32}
            onPress={onSwap}
            disabled={swapping}
          />
          <OnPhoto
            icon="close"
            label={copy.suggestedTile.remove(look.name)}
            size={32}
            onPress={onRemove}
          />
        </View>
      }
    />
  );
}
