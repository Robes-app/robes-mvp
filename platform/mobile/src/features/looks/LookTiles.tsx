import type { Look } from '@robes/contracts';
import { lookbook as copy, looks } from '@robes/copy';
import { anchorName, startedLabel } from '@robes/core/looks';
import { Card, IconButton, Image, Skeleton, Text } from '@robes/ui-native';
import { Pressable, View } from 'react-native';
import { renditionUri } from '@/lib/images';
import { localDate } from './saved-looks';

// The look's picture on a tile: Robes' frame or her render, else her first piece.
function heroOf(look: Look) {
  return look.image ?? look.pieces.find((p) => p.piece.image)?.piece.image ?? null;
}

function Picture({ look }: { look: Look }) {
  const image = heroOf(look);
  const uri = renditionUri(image, 180);
  return uri ? (
    <Image source={uri} alt="" blurhash={image?.blurhash} recyclingKey={look.id} />
  ) : (
    <Skeleton width="100%" aspectRatio={4 / 5} />
  );
}

// Saved: no eyebrow (the default state needs no label).
export function SavedTile({ look, onPress }: { look: Look; onPress: () => void }) {
  const around = look.anchor ? anchorName(look.anchor.label, look.anchor.brand) : '';
  return (
    <Card onPress={onPress} accessibilityLabel={look.name} className="flex-1">
      <Picture look={look} />
      <View className="gap-1 p-2">
        <Text size="small" numberOfLines={1}>
          {look.name}
        </Text>
        <Text size="caption" tone="muted" numberOfLines={1}>
          {around
            ? `${looks.look.worn(look.timesWorn)} · ${copy.meta.around(around)}`
            : looks.look.worn(look.timesWorn)}
        </Text>
      </View>
    </Card>
  );
}

// Draft: the same tile, dashed — a look, unfinished.
export function DraftTile({ look, onPress }: { look: Look; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${copy.draftTile.eyebrow}: ${look.nameProvisional ? copy.draftTile.untitled : look.name}`}
      onPress={onPress}
      style={{ width: 160 }}
      className="gap-1 rounded-soft border border-dashed border-border-control bg-surface p-1.5"
      testID={`draft-${look.id}`}
    >
      <Picture look={look} />
      <Text size="caption" tone="muted">
        {copy.draftTile.eyebrow}
      </Text>
      <Text
        size="small"
        numberOfLines={1}
        style={look.nameProvisional ? { fontStyle: 'italic' } : undefined}
      >
        {look.nameProvisional ? copy.draftTile.untitled : look.name}
      </Text>
      <Text size="caption" tone="muted" numberOfLines={1}>
        {copy.draftTile.meta(startedLabel(look.createdAt, localDate()))}
      </Text>
    </Pressable>
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
  const busy = swapping
    ? copy.suggestedTile.restyling
    : !look.image || look.framePending
      ? copy.suggestedTile.framing
      : null;
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={look.name}
      className="flex-1"
      testID={`suggested-${look.id}`}
    >
      <View>
        <Picture look={look} />
        {showMark && markUri ? (
          <View
            className="absolute bottom-2 left-2 overflow-hidden rounded-crisp border border-hairline bg-bg"
            style={{ width: 36 }}
          >
            <Image source={markUri} alt="" aspect="4:5" />
          </View>
        ) : null}
        <View className="absolute right-1 top-1 flex-row">
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
      </View>
      <View className="gap-1 p-2">
        <Text size="caption" tone="muted">
          {copy.suggestedTile.eyebrow}
        </Text>
        <Text size="small" numberOfLines={1}>
          {look.name}
        </Text>
        <Text size="caption" tone="muted" numberOfLines={1}>
          {busy ?? (around ? copy.suggestedTile.around(around) : copy.suggestedTile.fromPrompt)}
        </Text>
      </View>
    </Card>
  );
}
