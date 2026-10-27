'use client';

import { queryKeys, useApiClient, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook, looks as looksCopy, ui } from '@robes/copy';
import { lookLine, lookWearFor } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Eyebrow, Pill, SegmentedControl, Sheet, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { PHOTO_ACCEPT, uploadPhoto } from '@/lib/upload';
import { LookImage } from './look-image';
import { LookPicture } from './look-page';

const copy = looksCopy.page;
const seasons = lookbook.refine.seasons;
const onImage =
  'absolute z-10 flex size-10 items-center justify-center rounded-pill bg-bg/90 text-ink shadow-sm hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:text-ink-faint';

// The saved look's picture and what sits under it (Look redline 27 Oct; native twin
// mobile/src/features/looks/LookHero.tsx): THE LOOK, the picture with the diary bottom-left and
// her photograph bottom-right (↻ once one is kept), the line naming the pieces, the tags, then the
// hint to add her photograph — or, with both pictures, You · Model, which picks the record.
export function LookHero({ look, onDiary }: { look: Look; onDiary: () => void }) {
  const api = useApiClient();
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const landed = (updated: Look) => {
    queryClient.setQueryData(key, updated);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
  };
  const onError = (err: unknown) => toast({ message: errorCopy(err) });
  const attach = useApiMutation('looks.photo', { onSuccess: landed, onError });
  const update = useApiMutation('looks.update', {
    onSuccess: landed,
    onError: (err) => {
      onError(err);
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const onPicked = async (picked: File | undefined) => {
    if (!picked) return;
    setUploading(true);
    try {
      const asset = await uploadPhoto(api, picked, 'look_photo');
      attach.mutate({ params: { id: look.id }, input: { assetId: asset.id } });
    } catch (err) {
      onError(err);
    } finally {
      setUploading(false);
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

  const line = lookLine(look);
  const tags = [
    ...(look.climateBand === 'year_round' ? [] : [seasons[look.climateBand]]),
    ...lookWearFor(look),
  ];
  const both = look.photo !== null && look.model !== null;
  const hasPhoto = look.photo !== null;
  return (
    <div className="flex flex-col gap-3">
      <Eyebrow>{copy.theLook}</Eyebrow>
      <div className="relative">
        {look.frame && !(hasPhoto && look.record === 'photo') ? (
          <LookPicture look={look} />
        ) : (
          <LookImage look={look} priority sizes="(min-width: 768px) 40vw, 100vw" />
        )}
        <button
          type="button"
          onClick={onDiary}
          aria-label={lookbook.card.diary}
          title={lookbook.card.diary}
          className={`${onImage} bottom-3 left-3`}
        >
          <Icon name="plan" size={17} />
        </button>
        <button
          type="button"
          onClick={() => file.current?.click()}
          disabled={uploading || attach.isPending}
          aria-label={hasPhoto ? copy.replacePhoto : copy.addPhoto}
          title={hasPhoto ? copy.replacePhoto : copy.addPhoto}
          className={`${onImage} right-3 bottom-3`}
        >
          <Icon name={hasPhoto ? 'swap' : 'camera'} size={17} />
        </button>
        <input
          ref={file}
          type="file"
          accept={PHOTO_ACCEPT}
          // The button above is the door; the input itself is hidden from assistive tech.
          aria-hidden
          aria-label={hasPhoto ? copy.replacePhoto : copy.addPhoto}
          tabIndex={-1}
          className="sr-only"
          onChange={(e) => {
            void onPicked(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {line ? (
        <p className="font-display text-ink-muted text-lg italic leading-snug">{line}</p>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <ul aria-label={copy.tags} className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <li
              key={t}
              className="rounded-pill border border-hairline bg-surface px-2.5 py-1 font-sans text-[11px] text-ink-muted"
            >
              {t}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setTagsOpen(true)}
          className="relative shrink-0 font-sans text-[10px] text-ink-faint uppercase tracking-[0.2em] after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:text-ink focus-visible:outline-2 focus-visible:outline-focus-ring"
        >
          {copy.editTags}
        </button>
      </div>
      {both ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            label={copy.record.label}
            value={look.record}
            options={[
              { value: 'photo', label: copy.record.you },
              { value: 'model', label: copy.record.model },
            ]}
            onChange={choose}
          />
          <p className="font-display text-ink-muted text-sm italic">{copy.record.kept}</p>
        </div>
      ) : hasPhoto ? null : (
        <p className="font-display text-ink-muted text-base italic leading-snug">
          {copy.photoNote}
        </p>
      )}
      <Sheet open={tagsOpen} onOpenChange={setTagsOpen} title={copy.tags} closeLabel={ui.done}>
        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 font-sans text-ink-muted text-sm">{copy.season}</legend>
          <div className="flex flex-wrap gap-2">
            {(['spring_summer', 'autumn_winter', 'year_round'] as const).map((b) => (
              <Pill
                key={b}
                selected={look.climateBand === b}
                onClick={() =>
                  update.mutate({ params: { id: look.id }, input: { climateBand: b } })
                }
              >
                {seasons[b]}
              </Pill>
            ))}
          </div>
        </fieldset>
      </Sheet>
    </div>
  );
}
