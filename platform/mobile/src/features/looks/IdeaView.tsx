import { useApi } from '@robes/api-client/react';
import type { Idea, IdeaFrame, IdeaWay } from '@robes/contracts';
import { looks as copy, keyPiece as kp } from '@robes/copy';
import {
  Button,
  Eyebrow,
  fonts,
  Heading,
  Image,
  PrimaryScope,
  Sheet,
  Skeleton,
  Text,
} from '@robes/ui-native';
import { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { renditionUri } from '@/lib/images';

const GAP = 12;

function Frame({
  frame,
  title,
  onShow,
  showing,
}: {
  frame: IdeaFrame | undefined;
  title: string;
  onShow: () => void;
  showing: boolean;
}) {
  const uri = frame?.status === 'ready' ? renditionUri(frame.image, 360) : null;
  if (uri) {
    return (
      <Image source={uri} alt={copy.result.frameAlt(title)} blurhash={frame?.image?.blurhash} />
    );
  }
  // Only the first look is pictured up front; the rest (or a failed one) when she asks (UX-09).
  if (frame?.status === 'deferred' || frame?.status === 'failed') {
    return (
      <View className="aspect-[4/5] w-full items-center justify-center rounded-crisp border border-hairline">
        <Button
          variant="quiet"
          onPress={onShow}
          loading={showing}
          loadingLabel={copy.result.showLook}
          accessibilityHint={title}
        >
          {copy.result.showLook}
        </Button>
      </View>
    );
  }
  return <Skeleton width="100%" aspectRatio={4 / 5} />;
}

// A piece's colour as the model gave it (runtime data, never a literal in the source).
function Swatch({ hex, size = 14 }: { hex: string | null; size?: number }) {
  const valid = hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : null;
  return (
    <View
      className="rounded-pill border border-bg bg-surface-sunk"
      style={[{ width: size, height: size }, valid ? { backgroundColor: valid } : null]}
    />
  );
}

// A 4:5 card with the frosted swatch pill; the eyebrow and serif title beneath (legacy .kp-look-card).
function WayCard({
  way,
  frame,
  width,
  onOpen,
  onShow,
  showing,
}: {
  way: IdeaWay;
  frame: IdeaFrame | undefined;
  width: number;
  onOpen: () => void;
  onShow: () => void;
  showing: boolean;
}) {
  const yours = way.pieces.filter((p) => p.pieceId).length;
  return (
    <View style={{ width }} className="gap-3">
      <View>
        <Frame frame={frame} title={way.title} onShow={onShow} showing={showing} />
        {way.pieces.length ? (
          <View className="absolute bottom-3 left-3 flex-row items-center gap-2 rounded-pill bg-bg/85 px-3 py-1.5">
            <View className="flex-row">
              {way.pieces.map((p, i) => (
                <View key={`${p.name}-${p.role}`} style={i ? { marginLeft: -4 } : undefined}>
                  <Swatch hex={p.colorHex} />
                </View>
              ))}
            </View>
            <Text className="text-[11px] text-ink">{kp.pill(way.pieces.length, yours)}</Text>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={kp.open(way.title)}
        onPress={onOpen}
      >
        <Eyebrow>{way.eyebrow}</Eyebrow>
        <Heading size="md">{way.title}</Heading>
      </Pressable>
    </View>
  );
}

// The piece-by-piece sheet: one row per piece, her own marked; a way from before v2 shows its prose.
function PieceByPiece({ way }: { way: IdeaWay }) {
  if (way.pieces.length === 0) {
    return (
      <View className="gap-3">
        <Text>{way.outfit}</Text>
        {way.details ? <Text tone="muted">{way.details}</Text> : null}
        {way.accessories ? <Text tone="muted">{way.accessories}</Text> : null}
      </View>
    );
  }
  return (
    <View>
      {way.pieces.map((p) => (
        <View
          key={`${p.name}-${p.role}`}
          className="flex-row items-center gap-3 border-b border-hairline py-3"
        >
          <View className="size-10 items-center justify-center rounded-[6px] bg-surface">
            <Swatch hex={p.colorHex} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text
              numberOfLines={1}
              className="text-[9px] text-ink-faint uppercase"
              style={{ fontFamily: fonts.sans, letterSpacing: 1.6 }}
            >
              {`${p.category} · `}
              {p.pieceId ? (
                <Text className="text-accent-warm">{kp.inWardrobe}</Text>
              ) : (
                [p.brand, p.pricePoint].filter(Boolean).join(' ')
              )}
            </Text>
            <Text className="text-lg text-ink" style={{ fontFamily: fonts.displayRegular }}>
              {p.name}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export interface IdeaViewProps {
  idea: Idea;
  // Shown above the looks while frames are still arriving.
  progress?: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  onRemove: () => void;
  removing: boolean;
  onSaveWay: (wayIdx: number) => void;
  // The way being saved as a look, if any.
  savingWay: number | null;
  onShowFrame: (idx: number) => void;
  showingFrame: number | null;
}

// Worn three ways (legacy 7dfc96c, the native design): the piece and "Key piece · yours", a centred
// pager of 4:5 cards with dots, ONE action row for the current card, and a sheet per card.
export function IdeaView({
  idea,
  progress,
  onSave,
  saving,
  onRemove,
  removing,
  onSaveWay,
  savingWay,
  onShowFrame,
  showingFrame,
}: IdeaViewProps) {
  const saved = idea.savedAt !== null;
  const { width } = useWindowDimensions();
  const card = Math.min(342, width - 60);
  const side = (width - card) / 2;
  const pager = useRef<FlatList<IdeaWay>>(null);
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const anchor = useApi(
    'wardrobe.get',
    { params: { id: idea.anchor.type === 'piece' ? idea.anchor.pieceId : '' } },
    { enabled: idea.anchor.type === 'piece' },
  );
  const thumb = renditionUri(anchor.data?.image, 46);
  const go = (i: number) => {
    setCurrent(i);
    pager.current?.scrollToOffset({ offset: i * (card + GAP), animated: true });
  };
  const way = open === null ? null : (idea.ways[open] ?? null);

  return (
    <ScrollView contentContainerClassName="gap-6 pb-12">
      <View className="flex-row items-center gap-4 px-6">
        {thumb ? (
          <View
            style={{ width: 46 }}
            className="overflow-hidden rounded-[6px] border border-hairline"
          >
            <Image source={thumb} alt="" blurhash={anchor.data?.image?.blurhash} />
          </View>
        ) : null}
        <View className="flex-1 gap-1.5">
          <Eyebrow>{idea.anchor.type === 'piece' ? kp.eyebrowYours : kp.eyebrow}</Eyebrow>
          <Heading>{idea.title}</Heading>
          {idea.fallback ? <Text tone="muted">{copy.result.fallback}</Text> : null}
        </View>
      </View>
      {progress ? <View className="px-6">{progress}</View> : null}
      <FlatList
        ref={pager}
        testID="idea-ways"
        horizontal
        data={idea.ways}
        keyExtractor={(w) => w.title}
        showsHorizontalScrollIndicator={false}
        snapToInterval={card + GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: side, gap: GAP }}
        onMomentumScrollEnd={(e) =>
          setCurrent(Math.round(e.nativeEvent.contentOffset.x / (card + GAP)))
        }
        renderItem={({ item, index }) => (
          <View style={{ opacity: index === current ? 1 : 0.55 }}>
            <WayCard
              way={item}
              frame={idea.frames.find((f) => f.idx === index)}
              width={card}
              onOpen={() => {
                // A neighbour's tap brings it to the centre; the current card's opens its sheet.
                if (index !== current) go(index);
                setOpen(index);
              }}
              onShow={() => onShowFrame(index)}
              showing={showingFrame === index}
            />
          </View>
        )}
      />
      <View className="flex-row items-center justify-center gap-1.5">
        {idea.ways.map((w, i) => (
          <Pressable
            key={w.title}
            accessibilityRole="button"
            accessibilityLabel={kp.way(i + 1, idea.ways.length)}
            accessibilityState={{ selected: i === current }}
            onPress={() => go(i)}
            hitSlop={10}
          >
            <View
              className={`h-[5px] rounded-pill ${i === current ? 'bg-ink' : 'bg-border-control'}`}
              style={{ width: i === current ? 18 : 5 }}
            />
          </Pressable>
        ))}
      </View>
      <PrimaryScope>
        <View className="gap-3 px-6">
          {idea.ways[current] ? (
            <Button
              onPress={() => onSaveWay(current)}
              loading={savingWay === current}
              loadingLabel={copy.saveWay}
              accessibilityHint={idea.ways[current].title}
            >
              {copy.saveWay}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onPress={onSave}
            disabled={saved}
            loading={saving}
            loadingLabel={copy.result.save}
          >
            {saved ? copy.result.saved : copy.result.save}
          </Button>
          <Button
            variant="quiet"
            icon="trash"
            onPress={onRemove}
            loading={removing}
            className="self-center"
          >
            {copy.result.remove}
          </Button>
        </View>
      </PrimaryScope>
      <Sheet
        open={way !== null}
        onClose={() => setOpen(null)}
        title={way?.title}
        testID="way-sheet"
      >
        {way && open !== null ? (
          <PrimaryScope>
            <View className="gap-4">
              <Text size="caption" tone="muted">{`${way.eyebrow} · ${kp.sheetLine}`}</Text>
              <PieceByPiece way={way} />
              <Button
                onPress={() => {
                  onSaveWay(open);
                  setOpen(null);
                }}
                loading={savingWay === open}
                loadingLabel={copy.saveWay}
              >
                {copy.saveWay}
              </Button>
            </View>
          </PrimaryScope>
        ) : null}
      </Sheet>
    </ScrollView>
  );
}
