import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { Look, PieceImage } from '@robes/contracts';
import { errors, lookbook, looks as looksCopy, you } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { Image, Text, useColor, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { renditionUri } from '@/lib/images';
import { LookPicture } from './LookPicture';

const copy = lookbook.savedLook;

// Felix's SavedLook (3e; plan 2026-11-06 D8, D10): the photo edge to edge at 4:5 on `cream-100`,
// under the status bar, with the back disc top-left, the adjust disc bottom-left and the image
// stack bottom-right. The `Robes model` tag is gone from here (D10: the ModelStack on Home is the
// door to her model). Web twin: app/src/components/looks/saved-look.tsx.
export function SavedLookPhoto({
  look,
  onAdjust,
  onImages,
}: {
  look: Look;
  // The sparkle: opens the look's thread (PR 7 brings the AdjustSheet; today it is the dock).
  onAdjust: () => void;
  onImages: () => void;
}) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const ink = useColor('ink');
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  // Every saved look can be worn by a model: her twin, her filed cell, else a Robes model —
  // `stand`, the one renderOnModel draws on (beta dressed every saved look on open).
  const me = useApi('me.model.get');
  const canDress = !!me.data?.stand?.imageUrl && look.pieces.length > 0 && !look.frame;
  const dress = useApiMutation('looks.renderOnModel', {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: () => toast.show({ message: errors.internal }),
  });
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!canDress || look.model !== null || look.onModel === 'pending') return;
    if (look.status !== 'saved' || opened.current === look.id) return;
    opened.current = look.id;
    void api
      .call('looks.renderOnModel', { params: { id: look.id } })
      .then(() => queryClient.invalidateQueries({ queryKey: key }))
      .catch(() => undefined);
  }, [api, canDress, key, look.id, look.model, look.onModel, look.status, queryClient]);
  const dressing = (look.onModel === 'pending' || dress.isPending) && !look.frame;
  const hasPhoto = look.photo !== null;
  const render = renditionUri(look.image, 390);
  return (
    <View className="relative overflow-hidden bg-surface-sunk">
      {look.frame && !(hasPhoto && look.record === 'photo') ? (
        <LookPicture look={look} />
      ) : render ? (
        <Image
          source={render}
          alt={looksCopy.page.imageAlt(look.name)}
          blurhash={look.image?.blurhash}
        />
      ) : (
        <View accessibilityElementsHidden style={{ aspectRatio: 4 / 5 }} />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.back}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={10}
        testID="saved-look-back"
        className="absolute items-center justify-center rounded-pill bg-veil-soft"
        style={{ top: insets.top + 10, left: 12, width: 36, height: 36 }}
      >
        <Icon name="back" size={20} color={ink} />
      </Pressable>
      {dressing ? (
        <View
          className="absolute right-3 rounded-pill border border-hairline bg-bg px-3 py-1.5"
          style={{ top: insets.top + 12 }}
        >
          <Text size="caption" tone="muted" accessibilityLiveRegion="polite">
            {you.model.dressing}
          </Text>
        </View>
      ) : look.onModel === 'failed' && canDress && look.record !== 'photo' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => dress.mutate({ params: { id: look.id } })}
          className="absolute right-3 min-h-11 justify-center rounded-pill border border-hairline bg-bg px-3"
          style={{ top: insets.top + 12 }}
        >
          <Text size="caption">{you.model.undressed}</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.adjust}
        onPress={onAdjust}
        hitSlop={10}
        testID="saved-look-adjust"
        className="absolute items-center justify-center rounded-pill bg-veil-soft"
        style={{ left: 20, bottom: 25, width: 24, height: 24 }}
      >
        <Icon name="describe" size={13} color={ink} />
      </Pressable>
      <ImageStack look={look} onOpen={onImages} />
    </View>
  );
}

// The image-stack badge: three fanned cards (a dashed paper back card, the next photograph at 4°,
// the one in front) with an ink badge that counts her photographs, or reads + before the first.
function ImageStack({ look, onOpen }: { look: Look; onOpen: () => void }) {
  const front = look.record === 'photo' ? (look.photo ?? look.model) : (look.model ?? look.photo);
  const next = look.images.find((i) => i.image.assetId !== front?.assetId)?.image ?? null;
  const count = look.images.length;
  const bg = useColor('bg');
  const uri = (img: PieceImage | null) => renditionUri(img, 48);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        count ? `${copy.images} · ${looksCopy.page.wears.count(count)}` : copy.images
      }
      onPress={onOpen}
      hitSlop={10}
      testID="saved-look-stack"
      className="absolute"
      style={{ right: 20, bottom: 18, width: 40, height: 38 }}
    >
      <View
        className="absolute overflow-hidden rounded-xs border-ink-faint bg-veil-paper"
        style={{
          left: 16,
          top: 0,
          width: 22,
          height: 29,
          borderWidth: 1,
          borderStyle: 'dashed',
          transform: [{ rotate: '9deg' }],
        }}
      />
      <View
        className="absolute overflow-hidden rounded-xs border-surface-raised bg-surface-sunk"
        style={{
          left: 9,
          top: 3,
          width: 22,
          height: 29,
          borderWidth: 1,
          transform: [{ rotate: '4deg' }],
        }}
      >
        {next ? <ExpoImage source={{ uri: uri(next) ?? undefined }} style={{ flex: 1 }} /> : null}
      </View>
      <View
        className="absolute overflow-hidden rounded-xs border-surface-raised bg-surface-sunk"
        style={{ left: 0, top: 7, width: 24, height: 31, borderWidth: 1.5 }}
      >
        {front ? (
          <ExpoImage
            source={{ uri: uri(front) ?? undefined }}
            contentPosition={{ top: '20%', left: '50%' }}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
      <View
        className="absolute items-center justify-center rounded-pill bg-ink px-1"
        style={{ top: -9, right: -9, minWidth: 20, height: 20, borderWidth: 1.5, borderColor: bg }}
      >
        {count ? (
          <Text className="text-bg" style={{ fontSize: 11, lineHeight: 13 }}>
            {count}
          </Text>
        ) : (
          <Icon name="plus" size={11} color={bg} />
        )}
      </View>
    </Pressable>
  );
}
