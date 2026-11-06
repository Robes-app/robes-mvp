import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { errors, lookbook, wardrobe } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import { shadowNative } from '@robes/tokens';
import { Image, Sheet, Text, useColor, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { PICKER_OPTIONS, uploadPhoto } from '@/features/wardrobe/add-pieces';
import { SettingsRow } from '@/features/you/Settings';
import { renditionUri } from '@/lib/images';

const copy = lookbook.savedLook.manager;
type Card = { kind: 'robes' } | { kind: 'photo'; id: string };

// Felix's ImageManager (D13): the look's pictures as a swipeable strip of cards in the photo's
// frame, opened from the image-stack badge. Robes' picture leads the strip and can only be
// redrawn; her photographs follow, each with its ×; the last card adds one. A tap picks the card
// that leads the look, and Done keeps it (`looks.images.cover`). Web twin:
// app/src/components/looks/image-manager.tsx.
export function ImageManager({ look, onDone }: { look: Look; onDone: () => void }) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const ink = useColor('ink');
  const bg = useColor('bg');
  const muted = useColor('ink-muted');
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  const [choosing, setChoosing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const landed = (updated: Look) => {
    queryClient.setQueryData(key, updated);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
  };
  const onError = () => toast.show({ message: errors.internal });
  const add = useApiMutation('looks.images.add', { onSuccess: landed, onError });
  const remove = useApiMutation('looks.images.remove', { onSuccess: landed, onError });
  const cover = useApiMutation('looks.images.cover', { onSuccess: landed, onError });
  const current: Card =
    look.record === 'photo' && look.images[0]
      ? { kind: 'photo', id: look.images[0].id }
      : { kind: 'robes' };
  const [lead, setLead] = useState<Card>(current);
  const same = (a: Card, b: Card) =>
    a.kind === b.kind && (a.kind !== 'photo' || b.kind !== 'photo' || a.id === b.id);
  const finish = () => {
    if (!same(lead, current)) {
      cover.mutate({
        params: { id: look.id },
        input: { imageId: lead.kind === 'photo' ? lead.id : null },
      });
    }
    onDone();
  };
  const take = async (from: 'camera' | 'library') => {
    setChoosing(false);
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
      add.mutate({ params: { id: look.id }, input: { assetId } });
    } catch {
      onError();
    } finally {
      setUploading(false);
    }
  };
  // Cards are full width inside 40pt side padding, 10pt apart, snapping to centre.
  const cardWidth = width - 80;
  const ring = (on: boolean) => (on ? { borderWidth: 1.5, borderColor: ink } : {});
  const robes = look.model;
  const robesUri = renditionUri(robes, cardWidth);
  return (
    <View
      accessibilityLabel={copy.title}
      testID="image-manager"
      className="relative overflow-hidden bg-surface-sunk"
      style={{ aspectRatio: 4 / 5 }}
    >
      <ScrollView
        horizontal
        pagingEnabled={false}
        snapToInterval={cardWidth + 10}
        snapToAlignment="center"
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 40, gap: 10, alignItems: 'center' }}
        className="flex-1"
      >
        {robes && robesUri ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.lead(copy.robes)}
            accessibilityState={{ selected: lead.kind === 'robes' }}
            onPress={() => setLead({ kind: 'robes' })}
            className="overflow-hidden rounded-tile bg-surface-sunk"
            style={[{ width: cardWidth }, ring(lead.kind === 'robes'), shadowNative.float]}
          >
            <Image source={robesUri} alt={copy.robes} blurhash={robes.blurhash} />
          </Pressable>
        ) : null}
        {look.images.map((img, i) => {
          const on = lead.kind === 'photo' && lead.id === img.id;
          const uri = renditionUri(img.image, cardWidth);
          return (
            <View
              key={img.id}
              className="overflow-hidden rounded-tile bg-surface-sunk"
              style={[{ width: cardWidth }, ring(on), shadowNative.float]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.lead(copy.photo(i + 1))}
                accessibilityState={{ selected: on }}
                onPress={() => setLead({ kind: 'photo', id: img.id })}
              >
                {uri ? (
                  <Image source={uri} alt={copy.photo(i + 1)} blurhash={img.image.blurhash} />
                ) : (
                  <View style={{ aspectRatio: 4 / 5 }} />
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${copy.remove} · ${copy.photo(i + 1)}`}
                disabled={remove.isPending}
                hitSlop={8}
                onPress={() => {
                  if (on) setLead({ kind: 'robes' });
                  remove.mutate({ params: { id: look.id, imageId: img.id } });
                }}
                className="absolute items-center justify-center rounded-pill bg-veil-mid"
                style={{ top: 10, right: 10, width: 28, height: 28 }}
              >
                <Icon name="close" size={12} color={muted} />
              </Pressable>
            </View>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.add}
          disabled={uploading || add.isPending}
          onPress={() => setChoosing(true)}
          className="items-center justify-center gap-2.5 rounded-tile border-border-control bg-bg"
          style={{
            width: cardWidth,
            aspectRatio: 4 / 5,
            borderWidth: 1,
            borderStyle: 'dashed',
            opacity: uploading || add.isPending ? 0.6 : 1,
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
      <Sheet open={choosing} onClose={() => setChoosing(false)} title={copy.add} closeButton>
        <View className="overflow-hidden rounded-soft border border-hairline bg-surface-raised">
          <SettingsRow
            first
            label={wardrobe.add.doors.photograph}
            onPress={() => void take('camera')}
          />
          <SettingsRow label={wardrobe.add.doors.cameraRoll} onPress={() => void take('library')} />
        </View>
      </Sheet>
    </View>
  );
}
