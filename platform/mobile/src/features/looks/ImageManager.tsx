import { useApiClient } from '@robes/api-client/react';
import { type Look, lookStack } from '@robes/contracts';
import { errors, lookbook, wardrobe } from '@robes/copy';
import {
  canRemoveCard,
  type ImageStage,
  type StageCard,
  sameCard,
  stageAdd,
  stageCards,
  stageFront,
  stageInFront,
  stageRemove,
} from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { shadowNative } from '@robes/tokens';
import { Image, Sheet, Text, useColor, useToast } from '@robes/ui-native';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  useWindowDimensions,
  View,
} from 'react-native';
import { PICKER_OPTIONS, uploadPhoto } from '@/features/wardrobe/add-pieces';
import { SettingsRow } from '@/features/you/Settings';
import { renditionUri } from '@/lib/images';
import { LookPicture } from './LookPicture';
import { localPhoto, rememberLocalPhoto, type StageUpdate } from './look-images';

const copy = lookbook.savedLook.manager;

// Felix's ImageManager (D19, D20): the look's pictures as a swipeable strip of cards in the
// photo's frame, opened from the image stack. Robes' picture leads (unless she hid it), then her
// photographs, then the Add a photo card. A photo she picks uploads at once and lands in the
// frame, in focus; every card has its × but the last one left. ✓ leaves the card in view in
// front. Nothing is written here: the owner holds the stage until Update look. Opened from Home's
// stack, the Add a photo card is in focus. Web twin: app/src/components/looks/image-manager.tsx.
export function ImageManager({
  look,
  stage,
  onStage,
  onDone,
  focusAdd = false,
}: {
  look: Look;
  stage: ImageStage;
  onStage: StageUpdate;
  onDone: () => void;
  focusAdd?: boolean;
}) {
  const api = useApiClient();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const ink = useColor('ink');
  const bg = useColor('bg');
  const muted = useColor('ink-muted');
  const strip = useRef<ScrollViewInstance>(null);
  const inView = useRef(0);
  const [choosing, setChoosing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const base = lookStack(look);
  const cards = stageCards(base, stage);
  const removable = canRemoveCard(base, stage);
  // Cards are full width inside 40pt side padding, 10pt apart, snapping to centre.
  const cardWidth = width - 80;
  const step = cardWidth + 10;
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
    const card = cards[inView.current];
    if (card) onStage((s) => stageInFront(s, card));
    onDone();
  };
  // The camera or library opens only once the chooser has fully gone (Sheet onClosed): from the
  // Edit look sheet, iOS refused to present over a closing sheet and the screen froze.
  const picking = useRef<'camera' | 'library' | null>(null);
  const pick = (from: 'camera' | 'library') => {
    picking.current = from;
    setChoosing(false);
  };
  const chosen = () => {
    const from = picking.current;
    picking.current = null;
    if (from) void take(from);
  };
  const take = async (from: 'camera' | 'library') => {
    if (from === 'camera') {
      const allowed = await ImagePicker.requestCameraPermissionsAsync();
      if (!allowed.granted) return;
    }
    const picked =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    const photo = picked.assets?.[0];
    if (picked.canceled || !photo) return;
    setUploading(true);
    try {
      const assetId = await uploadPhoto(api, photo, 'look_photo');
      rememberLocalPhoto(assetId, photo.uri);
      onStage((s) => stageAdd(s, assetId));
    } catch {
      toast.show({ message: errors.internal });
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
      style={{ aspectRatio: 4 / 5 }}
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
        contentContainerStyle={{ paddingHorizontal: 40, gap: 10, alignItems: 'center' }}
        className="flex-1"
      >
        {cards.map((card) => {
          const label = card.kind === 'robes' ? copy.robes : copy.photo(++photoNo);
          return (
            <View
              key={card.kind === 'robes' ? 'robes' : card.kind === 'photo' ? card.id : card.assetId}
              accessibilityLabel={label}
              testID={`image-card-${card.kind}`}
              className="overflow-hidden rounded-tile bg-surface-sunk"
              style={[{ width: cardWidth }, shadowNative.float]}
            >
              <CardPicture look={look} card={card} alt={label} width={cardWidth} />
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
            </View>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.add}
          disabled={uploading}
          onPress={() => setChoosing(true)}
          className="items-center justify-center gap-2.5 rounded-tile border-border-control bg-bg"
          style={{
            width: cardWidth,
            aspectRatio: 4 / 5,
            borderWidth: 1,
            borderStyle: 'dashed',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          <View
            className="items-center justify-center rounded-pill border-rule-mid bg-surface-raised"
            style={[{ width: 56, height: 56, borderWidth: 0.5 }, shadowNative.float]}
          >
            <Icon name="camera" size={22} color={ink} />
          </View>
          <Text className="text-ink-muted" style={{ fontSize: 9, letterSpacing: 1.8 }}>
            {copy.add.toUpperCase()}
          </Text>
        </Pressable>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.done}
        onPress={finish}
        testID="image-manager-done"
        className="absolute items-center justify-center rounded-pill bg-scrim"
        style={{ right: 16, bottom: 16, width: 44, height: 44 }}
      >
        <Icon name="check" size={18} color={bg} />
      </Pressable>
      <Sheet
        open={choosing}
        onClose={() => setChoosing(false)}
        onClosed={chosen}
        title={copy.add}
        closeButton
      >
        <View className="overflow-hidden rounded-soft border border-hairline bg-surface-raised">
          <SettingsRow first label={wardrobe.add.doors.photograph} onPress={() => pick('camera')} />
          <SettingsRow label={wardrobe.add.doors.cameraRoll} onPress={() => pick('library')} />
        </View>
      </Sheet>
    </View>
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
