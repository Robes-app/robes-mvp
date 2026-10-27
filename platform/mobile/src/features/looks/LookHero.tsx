import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { errors, lookbook, looks as looksCopy, ui, wardrobe, you } from '@robes/copy';
import { lookLine, lookWearFor } from '@robes/core/looks';
import {
  Eyebrow,
  IconButton,
  Image,
  Pill,
  SegmentedControl,
  Sheet,
  Text,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { PICKER_OPTIONS, uploadPhoto } from '@/features/wardrobe/add-pieces';
import { SettingsRow } from '@/features/you/Settings';
import { renditionUri } from '@/lib/images';
import { LookPicture } from './LookPicture';

const copy = looksCopy.page;
const seasons = lookbook.refine.seasons;
const BANDS = ['spring_summer', 'autumn_winter', 'year_round'] as const;

// The saved look's picture and what sits under it (Look redline 27 Oct; web twin
// app/src/components/looks/look-hero.tsx): THE LOOK, the picture with the diary bottom-left and
// her photograph bottom-right (↻ once one is kept), the line naming the pieces, the tags, then the
// hint to add her photograph — or, with both pictures, You · Model, which picks the record.
export function LookHero({ look, onDiary }: { look: Look; onDiary: () => void }) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const landed = (updated: Look) => {
    queryClient.setQueryData(key, updated);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
  };
  const attach = useApiMutation('looks.photo', {
    onSuccess: landed,
    onError: () => toast.show({ message: errors.internal }),
  });
  const update = useApiMutation('looks.update', {
    onSuccess: landed,
    onError: () => {
      toast.show({ message: errors.internal });
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

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
    setBusy(true);
    try {
      const assetId = await uploadPhoto(api, photo, 'look_photo');
      attach.mutate({ params: { id: look.id }, input: { assetId } });
    } catch {
      toast.show({ message: errors.internal });
    } finally {
      setBusy(false);
    }
  };

  // The tap is the choice: the picture swaps at once, then the record is saved.
  const choose = (record: 'photo' | 'model') => {
    if (record === look.record) return;
    queryClient.setQueryData(key, {
      ...look,
      record,
      image: record === 'photo' ? look.photo : look.model,
    });
    update.mutate({ params: { id: look.id }, input: { record } });
  };

  const hasPhoto = look.photo !== null;
  const both = hasPhoto && look.model !== null;
  const render = renditionUri(look.image, 360);
  const line = lookLine(look);
  const tags = [
    ...(look.climateBand === 'year_round' ? [] : [seasons[look.climateBand]]),
    ...lookWearFor(look),
  ];
  return (
    <View className="gap-3">
      <Eyebrow>{copy.theLook}</Eyebrow>
      <View className="relative">
        {look.frame && !(hasPhoto && look.record === 'photo') ? (
          <LookPicture look={look} />
        ) : render ? (
          <View className="overflow-hidden rounded-crisp">
            <Image source={render} alt={copy.imageAlt(look.name)} blurhash={look.image?.blurhash} />
          </View>
        ) : (
          // No picture yet: the frame still stands, so its two doors have a place.
          <View
            accessibilityElementsHidden
            className="rounded-crisp bg-surface-sunk"
            style={{ aspectRatio: 4 / 5 }}
          />
        )}
        {look.onModel === 'pending' && !look.frame ? (
          // Her model is being dressed: a small chip on the picture.
          <View className="absolute top-3 left-3 rounded-pill border border-hairline bg-bg px-3 py-1.5">
            <Text size="caption" tone="muted" accessibilityLiveRegion="polite">
              {you.model.dressing}
            </Text>
          </View>
        ) : null}
        <View className="absolute bottom-3 left-3 rounded-pill bg-bg">
          <IconButton icon="plan" label={lookbook.card.diary} onPress={onDiary} />
        </View>
        <View className="absolute right-3 bottom-3 rounded-pill bg-bg">
          <IconButton
            icon={hasPhoto ? 'swap' : 'camera'}
            label={hasPhoto ? copy.replacePhoto : copy.addPhoto}
            disabled={busy || attach.isPending}
            onPress={() => setChoosing(true)}
          />
        </View>
      </View>
      {line ? (
        <Text italic size="caption" tone="muted">
          {line}
        </Text>
      ) : null}
      <View className="flex-row items-start justify-between gap-3">
        <View accessibilityLabel={copy.tags} className="flex-1 flex-row flex-wrap gap-1.5">
          {tags.map((t) => (
            <View key={t} className="rounded-pill border border-hairline bg-surface px-2.5 py-1">
              <Text size="caption" tone="muted" style={{ fontSize: 11 }}>
                {t}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.editTags}
          onPress={() => setTagsOpen(true)}
          hitSlop={12}
        >
          <Text
            size="caption"
            tone="faint"
            className="uppercase"
            style={{ fontSize: 10, letterSpacing: 2 }}
          >
            {copy.editTags}
          </Text>
        </Pressable>
      </View>
      {both ? (
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            label={copy.record.label}
            value={look.record}
            options={[
              { value: 'photo', label: copy.record.you },
              { value: 'model', label: copy.record.model },
            ]}
            onChange={choose}
          />
          <Text italic size="caption" tone="muted">
            {copy.record.kept}
          </Text>
        </View>
      ) : hasPhoto ? null : (
        <Text italic size="caption" tone="muted">
          {copy.photoNote}
        </Text>
      )}
      <Sheet
        open={choosing}
        onClose={() => setChoosing(false)}
        title={hasPhoto ? copy.replacePhoto : copy.addPhoto}
        closeButton
      >
        <View className="overflow-hidden rounded-soft border border-hairline bg-surface-raised">
          <SettingsRow
            first
            label={wardrobe.add.doors.photograph}
            onPress={() => void take('camera')}
          />
          <SettingsRow label={wardrobe.add.doors.cameraRoll} onPress={() => void take('library')} />
        </View>
      </Sheet>
      <Sheet
        open={tagsOpen}
        onClose={() => setTagsOpen(false)}
        title={copy.tags}
        closeLabel={ui.done}
      >
        <View className="gap-2 pb-4">
          <Text size="small" tone="muted">
            {copy.season}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {BANDS.map((b) => (
              <Pill
                key={b}
                selected={look.climateBand === b}
                onPress={() =>
                  update.mutate({ params: { id: look.id }, input: { climateBand: b } })
                }
              >
                {seasons[b]}
              </Pill>
            ))}
          </View>
        </View>
      </Sheet>
    </View>
  );
}
