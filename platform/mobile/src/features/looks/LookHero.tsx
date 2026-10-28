import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { errors, lookbook, looks as looksCopy, ui, you } from '@robes/copy';
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
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { renditionUri } from '@/lib/images';
import { useHerPhoto } from './her-photo';
import { LookPicture } from './LookPicture';

const copy = looksCopy.page;
const seasons = lookbook.refine.seasons;
const BANDS = ['spring_summer', 'autumn_winter', 'year_round'] as const;

// The saved look's picture and what sits under it (Look redline 27 Oct; web twin
// app/src/components/looks/look-hero.tsx): THE LOOK, the picture with the diary bottom-left and
// her photograph bottom-right (↻ once one is kept), the line naming the pieces, the tags, then the
// hint to add her photograph — or, with both pictures, You · Model, which picks the record.
export function LookHero({
  look,
  eyebrow,
  onDiary,
}: {
  look: Look;
  // What the look is (Saved look / Editing): said once, over the picture.
  eyebrow: string;
  onDiary: () => void;
}) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  const [tagsOpen, setTagsOpen] = useState(false);
  const landed = (updated: Look) => {
    queryClient.setQueryData(key, updated);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
  };
  // Every saved look can be worn by a model: her twin, her filed cell, else the generic Robes
  // model — `stand`, the one renderOnModel draws on (beta dressed every saved look).
  // Twin of web components/looks/look-hero.tsx.
  const me = useApi('me.model.get');
  const canDress = !!me.data?.stand?.imageUrl && look.pieces.length > 0 && !look.frame;
  const dress = useApiMutation('looks.renderOnModel', {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: () => toast.show({ message: errors.internal }),
  });
  const dressIfNeeded = (l: Look) => {
    if (canDress && l.model === null && l.onModel !== 'pending' && !dress.isPending) {
      dress.mutate({ params: { id: l.id } });
    }
  };
  // Opened with nothing drawn on a model yet (beta rendered every saved look on open): start it
  // quietly, once per look — a model still being drawn (conflict) waits for the next open.
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
  // Her photograph lands; her model starts dressing the look, so You · Model has both sides.
  const herPhoto = useHerPhoto(look, dressIfNeeded);
  const update = useApiMutation('looks.update', {
    onSuccess: landed,
    onError: () => {
      toast.show({ message: errors.internal });
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  // Model before her model has worn it starts the dressing; the picture follows when it lands.
  const choose = (record: 'photo' | 'model') => {
    if (record === look.record) return;
    herPhoto.choose(record);
    if (record === 'model') dressIfNeeded(look);
  };

  const hasPhoto = look.photo !== null;
  // You · Model stands once there is her photograph and a model side: drawn, or hers to dress.
  const both = hasPhoto && (look.model !== null || canDress);
  const render = renditionUri(look.image, 360);
  const line = lookLine(look);
  const editTags = (
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
  );
  const tags = [
    ...(look.climateBand === 'year_round' ? [] : [seasons[look.climateBand]]),
    ...lookWearFor(look),
  ];
  return (
    <View className="gap-3">
      <Eyebrow>{eyebrow}</Eyebrow>
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
        {(look.onModel === 'pending' || dress.isPending) && !look.frame ? (
          // Her model is being dressed: a small chip on the picture.
          <View className="absolute top-3 left-3 rounded-pill border border-hairline bg-bg px-3 py-1.5">
            <Text size="caption" tone="muted" accessibilityLiveRegion="polite">
              {you.model.dressing}
            </Text>
          </View>
        ) : look.onModel === 'failed' && canDress && look.record !== 'photo' ? (
          // The rack changed and the re-draw failed: say so (web twin look-hero.tsx).
          <Pressable
            accessibilityRole="button"
            onPress={() => dress.mutate({ params: { id: look.id } })}
            className="absolute top-3 left-3 min-h-11 justify-center rounded-pill border border-hairline bg-bg px-3"
          >
            <Text size="caption">{you.model.undressed}</Text>
          </Pressable>
        ) : null}
        <View className="absolute bottom-3 left-3 rounded-pill bg-bg">
          <IconButton icon="plan" label={lookbook.card.diary} onPress={onDiary} />
        </View>
        <View className="absolute right-3 bottom-3 rounded-pill bg-bg">
          <IconButton
            icon={hasPhoto ? 'swap' : 'camera'}
            label={herPhoto.label}
            disabled={herPhoto.busy}
            onPress={herPhoto.pick}
          />
        </View>
      </View>
      {/* Under the picture, one tight group: the line, the tags with Edit tags at the right
          (beside the line when there are no tags), then the hint or You · Model. */}
      <View className="gap-2">
        {line || !tags.length ? (
          <View className="flex-row items-baseline justify-between gap-3">
            <Text italic size="caption" tone="muted" className="flex-1">
              {line}
            </Text>
            {tags.length ? null : editTags}
          </View>
        ) : null}
        {tags.length ? (
          <View className="flex-row items-center justify-between gap-3">
            <View accessibilityLabel={copy.tags} className="flex-1 flex-row flex-wrap gap-1.5">
              {tags.map((t) => (
                <View
                  key={t}
                  className="rounded-pill border border-hairline bg-surface px-2.5 py-1"
                >
                  <Text size="caption" tone="muted" style={{ fontSize: 11 }}>
                    {t}
                  </Text>
                </View>
              ))}
            </View>
            {editTags}
          </View>
        ) : null}
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
      </View>
      {herPhoto.sheet}
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
