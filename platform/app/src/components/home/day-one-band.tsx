'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { Today } from '@robes/contracts';
import { diary } from '@robes/copy';
import { DAY_ONE_KEYS } from '@robes/core/home';
import { Icon } from '@robes/icons/web';
import { Button, Dialog, ErrorText, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { dayOneAsks } from '@/lib/diary';
import { errorCopy } from '@/lib/error-copy';
import { usePhotoFiling } from '@/lib/file-photo';
import { PHOTO_ACCEPT } from '@/lib/upload';
import { useSelfie } from '@/lib/use-selfie';

const copy = diary.dayOne;
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const tile =
  'flex h-[132px] w-[104px] shrink-0 flex-col items-center justify-center gap-2 rounded-soft border border-dashed border-selected-line bg-surface text-center';
const eyebrow = 'flex-1 font-sans text-[10px] font-normal uppercase tracking-[0.26em] text-ink';
const dismissBtn = `flex size-7 shrink-0 items-center justify-center rounded-pill font-sans text-base font-light text-ink-muted ${focus}`;

type Ask = 'model' | 'pieces';

// Day one (Front Door design 3a, plan 2026-11-02 §1.3; the five Robes models and no "Another
// model", plan 2026-11-05 §1.1): a full-bleed band above the strip with Choose your model (her
// twin's door, then the five Robes models) and Add your first pieces (Tops · Bottoms · Shoes ·
// Anything), each with a × that asks once and then stands down. The native twin is
// mobile/src/features/home/DayOneBand.tsx.
export function DayOneBand({ state }: { state: Today['home']['state'] }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const asks = dayOneAsks(state);
  const [asking, setAsking] = useState<Ask | null>(null);
  const [hidden, setHidden] = useState<Record<Ask, boolean>>({ model: false, pieces: false });
  const model = useApi('me.model.get', undefined, { enabled: asks.model });
  // Create your digital twin opens the camera at once (plan 2026-11-05 §1.1), no page between.
  const selfie = useSelfie();
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('today.get') });

  const showModel = asks.model && !hidden.model;
  const showPieces = asks.pieces && !hidden.pieces;
  if (!showModel && !showPieces) return null;

  // Okay: the section folds away now and stays away (the dismissal store keeps the key).
  const dismiss = (ask: Ask) => {
    setAsking(null);
    setHidden((h) => ({ ...h, [ask]: true }));
    void api
      .call('notifications.dismiss', { input: { key: DAY_ONE_KEYS[ask] } })
      .then(refresh)
      .catch((err) => toast({ message: errorCopy(err) }));
  };
  // A Robes model picked is remembered as a pick (never as skin and hair), and it stands under
  // her looks.
  const pick = (n: number) => {
    void api
      .call('me.model.update', { input: { preset: n } })
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.model.get') });
        refresh();
      })
      .catch((err) => toast({ message: errorCopy(err) }));
  };
  // Ticked: the Robes model her looks stand on — the one she chose, or the first until she does.
  const stand = model.data?.stand;
  const chosen = stand && stand.on !== 'robes' ? null : (model.data?.preset ?? 1);

  return (
    <section
      aria-label={copy.model}
      data-testid="day-one"
      className="-mx-5 flex flex-col gap-6 border-y border-rule-mid bg-surface-sunk px-5 pt-[18px] pb-5"
    >
      {showModel ? (
        <div className="flex flex-col gap-3" data-testid="day-one-model">
          <div className="flex items-center gap-2.5">
            <Icon name="user" size={14} className="shrink-0 text-ink-muted" />
            <h2 className={eyebrow}>{copy.model}</h2>
            <button
              type="button"
              aria-label={`${copy.dismiss}: ${copy.model}`}
              title={copy.dismiss}
              onClick={() => setAsking('model')}
              className={dismissBtn}
            >
              ×
            </button>
          </div>
          <ul className="-mx-5 flex gap-2.5 overflow-x-auto px-5 [scrollbar-width:none]">
            <li>
              <button
                type="button"
                onClick={selfie.start}
                disabled={selfie.busy}
                className={`${tile} px-2.5 text-ink-muted ${focus}`}
              >
                <Icon name="camera" size={15} />
                <span className="font-sans text-[11.5px] leading-[1.3]">{copy.twin}</span>
              </button>
            </li>
            {(model.data?.robesModels ?? []).map((g, i) => {
              const on = g.n === chosen;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={copy.modelPick(g.n)}
                    onClick={() => pick(g.n)}
                    data-testid={`day-one-model-${i}`}
                    className={`relative h-[132px] w-[104px] shrink-0 overflow-hidden rounded-soft border bg-surface ${
                      on ? 'border-selected-line' : 'border-transparent'
                    } ${focus}`}
                  >
                    {g.imageUrl ? (
                      // biome-ignore lint/performance/noImgElement: a signed catalog portrait, fixed frame
                      <img
                        src={g.imageUrl}
                        alt=""
                        className="absolute inset-0 size-full object-cover object-[50%_10%]"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-ink-faint">
                        <Icon name="user" size={22} />
                      </span>
                    )}
                    {on ? (
                      <span className="absolute bottom-2 left-2 flex size-5 items-center justify-center rounded-pill border-2 border-surface-raised bg-accent-plan text-surface-raised">
                        <Icon name="check" size={10} />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {selfie.error ? <ErrorText>{selfie.error}</ErrorText> : null}
          {selfie.field}
        </div>
      ) : null}
      {showPieces ? <PiecesAsk onDismiss={() => setAsking('pieces')} onFiled={refresh} /> : null}
      <Dialog
        open={asking !== null}
        onOpenChange={(o) => (o ? undefined : setAsking(null))}
        title={asking === 'pieces' ? copy.piecesAsk : copy.modelAsk}
        footer={
          <Button variant="primary" onClick={() => asking && dismiss(asking)}>
            {copy.ok}
          </Button>
        }
      />
    </section>
  );
}

// Add your first pieces: four dashed tiles, each a camera for that kind of piece, with a quieter
// door to her files beneath.
function PiecesAsk({ onDismiss, onFiled }: { onDismiss: () => void; onFiled: () => void }) {
  const { filing, file, reset } = usePhotoFiling();
  const camera = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const filed = filing.phase === 'filed';
  // One filed piece retires the ask; home reads the count again.
  if (filed) {
    reset();
    onFiled();
  }
  return (
    <div className="flex flex-col gap-3" data-testid="day-one-pieces">
      <div className="flex items-center gap-2.5">
        <Icon name="wardrobe" size={14} className="shrink-0 text-ink-muted" />
        <h2 className={eyebrow}>{copy.pieces}</h2>
        <button
          type="button"
          aria-label={`${copy.dismiss}: ${copy.pieces}`}
          title={copy.dismiss}
          onClick={onDismiss}
          className={dismissBtn}
        >
          ×
        </button>
      </div>
      <ul className="-mx-5 flex gap-2.5 overflow-x-auto px-5 [scrollbar-width:none]">
        {copy.tiles.map((what) => (
          <li key={what}>
            <div className={`${tile} gap-1.5`}>
              <button
                type="button"
                aria-label={copy.tile(what)}
                onClick={() => camera.current?.click()}
                className={`flex flex-col items-center gap-1.5 ${focus}`}
              >
                <Icon name="image" size={17} className="text-ink-faint" />
                <span className="font-sans text-[13px] text-ink">{what}</span>
              </button>
              <button
                type="button"
                onClick={() => files.current?.click()}
                className={`font-sans text-[10.5px] leading-[1.35] text-ink-muted ${focus}`}
              >
                or{' '}
                <span className="underline underline-offset-2">
                  {copy.browse.replace(/^or /, '')}
                </span>
              </button>
            </div>
          </li>
        ))}
      </ul>
      <input
        ref={camera}
        type="file"
        accept={PHOTO_ACCEPT}
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void file(f);
        }}
      />
      <input
        ref={files}
        type="file"
        accept={PHOTO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        data-testid="day-one-browse"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void file(f);
        }}
      />
    </div>
  );
}
