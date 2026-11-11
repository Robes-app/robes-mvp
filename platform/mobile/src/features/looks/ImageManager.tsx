import { useApiClient } from '@robes/api-client/react';
import { type Look, lookStack } from '@robes/contracts';
import { lookbook } from '@robes/copy';
import {
  canRemoveCard,
  type ImageStage,
  type StageCard,
  sameCard,
  stageAdd,
  stageCards,
  stageFront,
  stageRemove,
} from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { palette, shadowNative } from '@robes/tokens';
import { Image, Text, useColor, useReducedMotion } from '@robes/ui-native';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaptureCamera } from '@/features/capture/CaptureCamera';
import { type PickedPhoto, uploadPhoto } from '@/features/wardrobe/add-pieces';
import { renditionUri } from '@/lib/images';
import { LookPicture } from './LookPicture';
import { localPhoto, rememberLocalPhoto, type StageUpdate } from './look-images';

const copy = lookbook.savedLook.manager;

// The strip's card (Capture PRD 3.1): 244 × 320 at a 4pt radius, 12pt apart.
const CARD_W = 244;
const CARD_H = 320;
const GAP = 12;
const STEP = CARD_W + GAP;

// Felix's ImageManager (D19, D20) as the Edit look photo strip (Capture PRD flow 3; prototype
// "Add a photo to a look"): the look's pictures as 244 × 320 cards on a warm band, the one in view
// centred. Robes' picture leads with its sparkle (unless she hid it), then her photographs, then
// the dashed Add a photo card, which opens the camera that only adds an image — it never reads the
// pieces. Add to look uploads the photograph and it settles into the strip, in focus; every card
// has its × but the last one left. ✓ hands the card in view to the owner as the cover: a saved
// look keeps the strip there and then (never waiting for Update look), a draft as it is saved. Opened from the Edit look sheet or Home's stack,
// the Add a photo card is in focus. Web twin: app/src/components/looks/image-manager.tsx.
export function ImageManager({
  look,
  stage,
  onStage,
  onDone,
  busy = false,
  focusAdd = false,
  onBack,
}: {
  look: Look;
  stage: ImageStage;
  onStage: StageUpdate;
  // The card in view as she taps ✓; null on the Add a photo card, which leaves the front as it was.
  onDone: (front: StageCard | null) => void;
  // The strip is being kept: ✓ waits.
  busy?: boolean;
  focusAdd?: boolean;
  // On the saved look's page (3e) the band starts under the status bar and carries the back disc
  // that stood on the picture, so she can always leave.
  onBack?: () => void;
}) {
  const api = useApiClient();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const top = onBack ? insets.top : 0;
  const ink = useColor('ink');
  const bg = useColor('bg');
  const muted = useColor('ink-muted');
  const strip = useRef<ScrollViewInstance>(null);
  const inView = useRef(0);
  const [camera, setCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const base = lookStack(look);
  const cards = stageCards(base, stage);
  const removable = canRemoveCard(base, stage);
  const cardWidth = CARD_W;
  const step = STEP;
  // The card in view sits in the middle of the band.
  const side = Math.max(0, (width - CARD_W) / 2);
  const show = (index: number, animated: boolean) => {
    strip.current?.scrollTo({ x: index * step, animated });
    inView.current = index;
  };
  // As it opens: the Add a photo card (Home's +), else the card in front.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, as the strip opens
  useEffect(() => {
    const front = stageFront(base, stage);
    const at = front ? cards.findIndex((c) => sameCard(c, front)) : 0;
    requestAnimationFrame(() => show(focusAdd ? cards.length : Math.max(0, at), false));
  }, []);
  // A photograph she just added comes into the frame.
  const added = stage.added.length;
  const lastAdded = useRef(added);
  // biome-ignore lint/correctness/useExhaustiveDependencies: follows the count of added photos
  useEffect(() => {
    if (added > lastAdded.current) requestAnimationFrame(() => show(cards.length - 1, true));
    lastAdded.current = added;
  }, [added]);

  const finish = () => {
    if (busy) return;
    onDone(cards[inView.current] ?? null);
  };
  // Add to look: the photograph uploads, joins the stage, and the camera gives way to the strip.
  const add = async (photo: PickedPhoto) => {
    if (uploading) return;
    setUploading(true);
    setFailed(false);
    try {
      const assetId = await uploadPhoto(api, photo, 'look_photo');
      rememberLocalPhoto(assetId, photo.uri);
      onStage((s) => stageAdd(s, assetId));
      setCamera(false);
    } catch {
      setFailed(true);
    } finally {
      setUploading(false);
    }
  };
  let photoNo = 0;
  return (
    <View
      accessibilityLabel={copy.title}
      testID="image-manager"
      className="relative overflow-hidden bg-surface-sunk"
      style={{ height: 360 + top, paddingTop: top }}
    >
      <ScrollView
        ref={strip}
        horizontal
        pagingEnabled={false}
        snapToInterval={step}
        snapToAlignment="center"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          inView.current = Math.round(e.nativeEvent.contentOffset.x / step);
        }}
        contentContainerStyle={{ paddingHorizontal: side, gap: GAP, alignItems: 'center' }}
        className="flex-1"
      >
        {cards.map((card) => {
          const label = card.kind === 'robes' ? copy.robes : copy.photo(++photoNo);
          return (
            <Card
              key={card.kind === 'robes' ? 'robes' : card.kind === 'photo' ? card.id : card.assetId}
              label={label}
              kind={card.kind}
            >
              <CardPicture look={look} card={card} alt={label} width={cardWidth} />
              {card.kind === 'robes' ? (
                // Robes drew this one: its sparkle, bottom-right (PRD 3.1).
                <View pointerEvents="none" style={{ position: 'absolute', right: 10, bottom: 10 }}>
                  <Icon name="describe" size={16} color={SPARKLE} />
                </View>
              ) : null}
              {removable ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.remove} · ${label}`}
                  hitSlop={8}
                  onPress={() => onStage((s) => stageRemove(base, s, card))}
                  className="absolute items-center justify-center rounded-pill bg-veil-mid"
                  style={{ top: 10, right: 10, width: 28, height: 28 }}
                >
                  <Icon name="close" size={12} color={muted} />
                </Pressable>
              ) : null}
            </Card>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.add}
          onPress={() => setCamera(true)}
          testID="image-card-add"
          className="items-center justify-center gap-3 border-border-control bg-bg"
          style={{
            width: CARD_W,
            height: CARD_H,
            borderRadius: 4,
            borderWidth: 1,
            borderStyle: 'dashed',
          }}
        >
          <View
            className="items-center justify-center rounded-pill bg-surface-raised"
            style={[{ width: 52, height: 52 }, shadowNative.float]}
          >
            <Icon name="camera" size={19} color={ink} />
          </View>
          <Text className="text-ink-muted" style={{ fontSize: 9, letterSpacing: 1.44 }}>
            {copy.add.toUpperCase()}
          </Text>
        </Pressable>
      </ScrollView>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={lookbook.savedLook.back}
          onPress={onBack}
          hitSlop={10}
          testID="saved-look-back"
          className="absolute items-center justify-center rounded-pill bg-veil-soft"
          style={{ top: top + 10, left: 12, width: 36, height: 36 }}
        >
          <Icon name="back" size={20} color={ink} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.done}
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={finish}
        testID="image-manager-done"
        className="absolute items-center justify-center rounded-pill bg-scrim"
        style={{ right: 16, bottom: 16, width: 44, height: 44, opacity: busy ? 0.5 : 1 }}
      >
        <Icon name="check" size={18} color={bg} />
      </Pressable>
      {/* The camera that only adds an image (PRD 3.2): over the sheet, never a piece read. */}
      <Modal
        visible={camera}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setCamera(false)}
      >
        {camera ? (
          <CaptureCamera
            copy={copy.camera}
            review="pills"
            busy={uploading}
            error={failed ? copy.camera.failed : null}
            onUse={(photo) => void add(photo)}
            onClose={() => {
              setFailed(false);
              setCamera(false);
            }}
          />
        ) : null}
      </Modal>
    </View>
  );
}

const SPARKLE = `${palette.white}D9`;

// One card of the strip. A photograph just added settles in: scale 0.94 → 1 as it fades up, over
// 450ms (PRD 3.4); still, with reduce motion on.
function Card({
  label,
  kind,
  children,
}: {
  label: string;
  kind: StageCard['kind'];
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const pop = useRef(new Animated.Value(kind === 'added' && !reduced ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(pop, {
      toValue: 1,
      duration: 450,
      easing: Easing.bezier(0.2, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [pop]);
  return (
    <Animated.View
      accessibilityLabel={label}
      testID={`image-card-${kind}`}
      className="overflow-hidden bg-surface-sunk"
      style={[
        { width: CARD_W, height: CARD_H, borderRadius: 4 },
        shadowNative.float,
        {
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// One card's picture: Robes' frame or render, her photograph, or the one she just picked (shown
// from the file in hand while its renditions are made).
export function CardPicture({
  look,
  card,
  alt,
  width,
}: {
  look: Look;
  card: StageCard;
  alt: string;
  width: number;
}) {
  if (card.kind === 'robes') {
    if (look.frame) return <LookPicture look={look} />;
    const uri = renditionUri(look.model, width);
    return uri ? (
      <Image source={uri} alt={alt} blurhash={look.model?.blurhash ?? null} />
    ) : (
      <View style={{ aspectRatio: 4 / 5 }} />
    );
  }
  if (card.kind === 'added') {
    const uri = localPhoto(card.assetId);
    return uri ? <Image source={uri} alt={alt} /> : <View style={{ aspectRatio: 4 / 5 }} />;
  }
  const img = look.images.find((i) => i.id === card.id)?.image ?? null;
  const uri = renditionUri(img, width);
  return uri ? (
    <Image source={uri} alt={alt} blurhash={img?.blurhash ?? null} />
  ) : (
    <View style={{ aspectRatio: 4 / 5 }} />
  );
}
