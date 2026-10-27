import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { anchorName, lookFacts, lookWearFor, startedLabel } from '@robes/core/looks';
import type { IconName } from '@robes/icons';
import { Icon } from '@robes/icons/native';
import { fonts, Image, MIN_TOUCH, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { renditionUri } from '@/lib/images';
import { LookTile } from './LookTile';
import { Scanning, scanningLine } from './ScanLine';
import { localDate } from './saved-looks';

// A control on the photograph: drawn small (32pt ✕, 36pt calendar — beta's size, not a large
// white disc) with the hit area reaching out to 44pt.
function OnPhoto({
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

// Saved: no eyebrow (the default state needs no label). The calendar sits ON the image bottom
// left — the look's own diary door, so a day is set without leaving the grid (legacy 13 Oct) —
// and ✕ deletes, top right, as on a suggestion.
export function SavedTile({
  look,
  onPress,
  onDiary,
  onDelete,
}: {
  look: Look;
  onPress: () => void;
  onDiary?: () => void;
  onDelete?: () => void;
}) {
  return (
    <LookTile
      look={look}
      onPress={onPress}
      className="flex-1"
      tag={lookWearFor(look)[0] ?? null}
      meta={copy.meta.card(lookFacts(look, look.pieces.length))}
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

// Suggested: Robes' frame, where it came from in the corner, ✕ and ↻ always shown.
export function SuggestedTile({
  look,
  onPress,
  onRemove,
  onSwap,
  swapping,
  showMark = true,
}: {
  look: Look;
  onPress: () => void;
  onRemove: () => void;
  onSwap: () => void;
  swapping: boolean;
  showMark?: boolean;
}) {
  const around = look.anchor ? anchorName(look.anchor.label, look.anchor.brand) : '';
  const busy = scanningLine(look, swapping);
  return (
    <LookTile
      look={look}
      onPress={onPress}
      className="flex-1"
      eyebrow={copy.suggestedTile.eyebrow}
      eyebrowTone="warm"
      meta={around ? copy.suggestedTile.around(around) : copy.suggestedTile.fromPrompt}
      testID={`suggested-${look.id}`}
      onImage={
        <>
          {busy ? <Scanning line={busy} /> : null}
          {showMark ? <SuggestedMark look={look} /> : null}
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
