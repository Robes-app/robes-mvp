import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { anchorName, lookFacts, startedLabel } from '@robes/core/looks';
import { IconButton, Image } from '@robes/ui-native';
import { View } from 'react-native';
import { renditionUri } from '@/lib/images';
import { LookTile } from './LookTile';
import { Scanning, scanningLine } from './ScanLine';
import { localDate } from './saved-looks';

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
      meta={copy.meta.card(lookFacts(look, look.pieces.length))}
      onImage={
        onDiary ? (
          <View className="absolute bottom-2 left-2 rounded-pill bg-bg">
            <IconButton icon="plan" label={copy.card.diary} onPress={onDiary} />
          </View>
        ) : null
      }
      corner={
        onDelete ? (
          <View className="rounded-pill bg-bg">
            <IconButton icon="close" label={copy.card.delete} onPress={onDelete} />
          </View>
        ) : null
      }
    />
  );
}

// Draft: the same tile, dashed — a look, unfinished.
export function DraftTile({ look, onPress }: { look: Look; onPress: () => void }) {
  const name = look.nameProvisional ? copy.draftTile.untitled : look.name;
  return (
    <LookTile
      look={look}
      onPress={onPress}
      width={160}
      dashed
      eyebrow={copy.draftTile.eyebrow}
      name={name}
      italic={look.nameProvisional}
      label={`${copy.draftTile.eyebrow}: ${name}`}
      meta={copy.draftTile.meta(startedLabel(look.createdAt, localDate()))}
      testID={`draft-${look.id}`}
    />
  );
}

// Suggested: Robes' frame, the piece it was styled around in the corner, ✕ and ↻ always shown.
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
  const markUri = renditionUri(look.anchor?.image, 36);
  const busy = scanningLine(look, swapping);
  return (
    <LookTile
      look={look}
      onPress={onPress}
      className="flex-1"
      eyebrow={copy.suggestedTile.eyebrow}
      meta={around ? copy.suggestedTile.around(around) : copy.suggestedTile.fromPrompt}
      testID={`suggested-${look.id}`}
      onImage={
        <>
          {busy ? <Scanning line={busy} /> : null}
          {showMark && markUri ? (
            <View
              className="absolute bottom-2 left-2 overflow-hidden rounded-crisp border border-hairline bg-bg"
              style={{ width: 36 }}
            >
              <Image source={markUri} alt="" aspect="4:5" />
            </View>
          ) : null}
        </>
      }
      corner={
        <View className="flex-row rounded-pill bg-bg">
          <IconButton
            icon="close"
            label={copy.suggestedTile.remove(look.name)}
            onPress={onRemove}
          />
          <IconButton
            icon="swap"
            label={copy.suggestedTile.swap(look.name)}
            onPress={onSwap}
            disabled={swapping}
          />
        </View>
      }
    />
  );
}
