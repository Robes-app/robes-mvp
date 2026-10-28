'use client';

import { isApiClientError } from '@robes/api-client';
import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { CreateLookInput, Look, Model, Piece } from '@robes/contracts';
import { lookbook as copy, looks as looksCopy } from '@robes/copy';
import {
  compositionKey,
  DRESS_DEBOUNCE_MS,
  filledSlots,
  HOTSPOTS,
  type HotspotSlot,
  placePick,
} from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import {
  Button,
  Dialog,
  Eyebrow,
  IconButton,
  InlineTitleField,
  SegmentedControl,
  Skeleton,
  useToast,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { usePushedView } from '@/components/shell/app-shell';
import { errorCopy } from '@/lib/error-copy';
import { usePhotoFiling } from '@/lib/file-photo';
import { useLookEditor } from '@/lib/look-editor';
import { useLetGo, useRefreshLooks, useSaveLook } from '@/lib/look-states';
import { GenericModelBadge } from './generic-model-badge';
import { useHerPhoto } from './her-photo';
import { LookImage } from './look-image';
import { LookPromptBox } from './look-prompt-box';
import { RackRowCard } from './rack-row';
import { SwapSheet } from './swap-sheet';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

const draftsFull = (err: unknown): boolean =>
  isApiClientError(err) &&
  err.code === 'conflict' &&
  (err.details as { reason?: string } | undefined)?.reason === 'drafts_full';

const pronoun = (m: Model | undefined) =>
  m?.presence === 'man' ? 'him' : m?.presence === 'unspecified' ? 'them' : 'her';

type Opened = { slot: HotspotSlot } | { add: true } | { swap: string };

// The draft look (legacy 4d + the 2026-10-15 passes): her model — or Robes' generic one — on a 4:5
// canvas with a hotspot per part of her; a pick dresses her in place, the rack beneath, and the
// draft stays in this one composer until Save. Nothing is a row until the first piece lands; then
// it is a draft that waits in In progress. The native twin is mobile/src/features/looks/Composer.tsx.
export function Composer({
  pieceId,
  look,
  onSaved,
}: {
  pieceId?: string;
  look?: Look;
  onSaved?: (look: Look) => void;
}) {
  usePushedView();
  return look ? (
    <DraftComposer look={look} {...(onSaved ? { onSaved } : {})} />
  ) : (
    <EmptyComposer {...(pieceId ? { pieceId } : {})} />
  );
}

// Before the first piece: the model in her base layer and the doors in; the first pick makes the
// draft and the composer carries on under its own address.
// shortcut: no "Add your photograph" here yet (beta showed it on the new canvas) — her photograph
// lands on a look, and nothing is a row until the first piece; the camera stands from the draft on.
function EmptyComposer({ pieceId }: { pieceId?: string }) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const refresh = useRefreshLooks();
  const model = useApi('me.model.get');
  const [opened, setOpened] = useState<Opened | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState<{ input: CreateLookInput; oldest: string } | null>(null);
  const photo = usePhotoFiling();

  const create = async (input: CreateLookInput) => {
    setBusy(true);
    try {
      const made = await api.call('looks.create', { input });
      refresh(made);
      router.replace(`/look/${made.id}`);
    } catch (err) {
      setBusy(false);
      if (!draftsFull(err)) {
        toast({ message: errorCopy(err) });
        return;
      }
      const drafts = await api
        .call('looks.list', { input: { limit: 60, status: 'draft' } })
        .catch(() => null);
      setFull({ input, oldest: drafts?.items.at(-1)?.name ?? copy.draftTile.untitled });
    }
  };
  const start = (piece: Piece) =>
    void create({
      status: 'draft',
      pieces: [{ pieceId: piece.id }],
      ...(name.trim() ? { name: name.trim() } : {}),
    });

  // "Start a look with it" from a piece: the draft opens with that piece on the rack.
  const started = useRef(false);
  useEffect(() => {
    if (pieceId && !started.current) {
      started.current = true;
      void create({ status: 'draft', pieces: [{ pieceId }], anchorPieceId: pieceId });
    }
  });
  // A photograph filed from the sheet starts the look with the piece it became.
  const filed = photo.filing.phase === 'filed' ? photo.filing.piece : null;
  useEffect(() => {
    if (!filed) return;
    photo.reset();
    start(filed);
  });
  const reading = photo.filing.phase === 'uploading' || photo.filing.phase === 'reading';

  return (
    <DraftLayout
      heading={copy.newLook}
      name={name}
      onName={setName}
      count={0}
      canvas={
        <ModelCanvas
          model={model.data}
          pending={model.isPending}
          filled={new Set()}
          chip={reading ? copy.figure.reading : null}
          disabled={busy}
          onHotspot={(slot) => setOpened({ slot })}
        />
      }
      footer={
        <DraftBar
          onDiscard={() => router.push('/looks')}
          onSave={() => undefined}
          canSave={false}
          saving={busy}
        />
      }
    >
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpened({ add: true })}
        className={`min-h-13 rounded-soft border border-dashed border-border-control text-sm text-ink-muted hover:text-ink ${focus}`}
      >
        {copy.rack.addPiece}
      </button>
      <Link
        href="/looks/new/photo"
        className={`self-center text-sm text-ink-muted underline underline-offset-4 hover:text-ink ${focus}`}
      >
        {copy.figure.start.photo}
      </Link>
      <WardrobeSheet
        opened={opened}
        rows={[]}
        onClose={() => setOpened(null)}
        onPick={(piece) => start(piece)}
        onSnap={(file) => void photo.file(file)}
      />
      <Dialog
        open={full !== null}
        onOpenChange={(o) => {
          if (!o) setFull(null);
        }}
        title={copy.drafts.fullTitle}
        description={full ? copy.drafts.fullBody(full.oldest) : undefined}
        footer={
          <>
            <Button variant="quiet" onClick={() => setFull(null)}>
              {copy.drafts.keep}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const input = full?.input;
                setFull(null);
                if (input) void create({ ...input, letGoOldest: true });
              }}
            >
              {copy.drafts.letGo}
            </Button>
          </>
        }
      />
    </DraftLayout>
  );
}

// Her model wears what is on the rack, re-drawn once a composition settles (DRESS_DEBOUNCE_MS):
// the server keys each render by the model and the rack, so asking for one already drawn spends
// nothing. While the next frame comes the last one stays up under "Dressing her…".
function useDress(look: Look, enabled: boolean) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const key = compositionKey(look.pieces.map((p) => p.piece.id));
  // A frame already on file for this composition when she opens it is not re-announced.
  const settled = useRef(look.onModel === 'ready' ? key : null);
  const [asked, setAsked] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled || !key || key === asked) return;
    const t = setTimeout(() => {
      setAsked(key);
      void api
        .call('looks.renderOnModel', { params: { id: look.id } })
        .then(() =>
          queryClient.invalidateQueries({
            queryKey: queryKeys.call('looks.get', { params: { id: look.id } }),
          }),
        )
        // No model to stand on yet, or no image quota: the canvas stays as it is.
        .catch(() => undefined);
    }, DRESS_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [api, queryClient, enabled, key, asked, look.id]);
  const dressing =
    enabled &&
    key !== '' &&
    (look.onModel === 'pending' || (key !== asked && key !== settled.current));
  // A render that failed is said, with a retry — never a blank frame (staging, 28 Oct).
  const failed = enabled && key !== '' && !dressing && look.onModel === 'failed';
  const retry = () => {
    void api
      .call('looks.renderOnModel', { params: { id: look.id } })
      .then(() =>
        queryClient.invalidateQueries({
          queryKey: queryKeys.call('looks.get', { params: { id: look.id } }),
        }),
      )
      .catch(() => undefined);
  };
  return { dressing, failed, retry };
}

function DraftComposer({ look, onSaved }: { look: Look; onSaved?: (look: Look) => void }) {
  const router = useRouter();
  const editor = useLookEditor(look);
  const model = useApi('me.model.get');
  const save = useSaveLook(onSaved);
  const letGo = useLetGo(copy.discarded);
  const photo = usePhotoFiling();
  const [name, setName] = useState(look.nameProvisional ? '' : look.name);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [asking, setAsking] = useState(false);
  const typed = name.trim() && name.trim() !== look.name ? name.trim() : undefined;
  const rows = editor.rack.rows;
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const {
    dressing,
    failed: undressed,
    retry,
  } = useDress(look, Boolean(model.data) && look.pieces.length > 0);

  const pick = (piece: Piece, how: Opened) => {
    if ('swap' in how) return editor.swap(how.swap, piece);
    const placed = placePick(rows, piece.category, 'slot' in how);
    if ('swap' in placed) editor.swap(placed.swap, piece);
    else editor.add(piece);
  };
  // A photograph filed from the sheet lands where the sheet was opened.
  const snapFor = useRef<Opened>({ add: true });
  const filed = photo.filing.phase === 'filed' ? photo.filing.piece : null;
  useEffect(() => {
    if (!filed) return;
    photo.reset();
    pick(filed, snapFor.current);
  });
  const reading = photo.filing.phase === 'uploading' || photo.filing.phase === 'reading';
  // Her photograph of the look (beta's camera on the canvas): once kept, You · Model under the
  // canvas picks which picture stands — her photograph, or her model wearing the rack.
  const herPhoto = useHerPhoto(look);
  const own = look.photo !== null && look.record === 'photo';
  const rendered = own
    ? look
    : look.onModel && look.model?.status === 'ready' && look.pieces.length > 0
      ? { ...look, image: look.model }
      : null;

  return (
    <DraftLayout
      name={name}
      onName={setName}
      onNameDone={() => {
        if (typed) editor.rename(typed);
      }}
      onNameCancel={() => setName(look.nameProvisional ? '' : look.name)}
      count={rows.length}
      canvas={
        <>
          <ModelCanvas
            model={model.data}
            pending={model.isPending}
            rendered={rendered}
            own={own}
            filled={filledSlots(rows.map((r) => r.category))}
            chip={
              reading
                ? copy.figure.reading
                : dressing && !own
                  ? copy.figure.dressing(pronoun(model.data))
                  : null
            }
            onHotspot={(slot) => setOpened({ slot })}
            photo={herPhoto}
            {...(undressed && !own && !reading
              ? { undressed: { label: copy.figure.undressed(pronoun(model.data)), onRetry: retry } }
              : {})}
          />
          {herPhoto.input}
          {herPhoto.hasPhoto ? (
            <SegmentedControl
              label={looksCopy.page.record.label}
              value={look.record}
              options={[
                { value: 'photo', label: looksCopy.page.record.you },
                { value: 'model', label: looksCopy.page.record.model },
              ]}
              onChange={herPhoto.choose}
            />
          ) : null}
        </>
      }
      footer={
        <DraftBar
          onDiscard={() => {
            letGo(look.id);
            router.push('/looks');
          }}
          onSave={() =>
            save.mutate({ params: { id: look.id }, input: typed ? { name: typed } : {} })
          }
          canSave={rows.length > 0}
          saving={save.isPending}
          onAsk={() => setAsking((a) => !a)}
          asking={asking}
          ask={
            asking ? (
              <LookPromptBox
                lookId={look.id}
                name={look.name}
                surface="draft"
                rack={editor.rack}
                anchorPieceId={look.anchor?.id ?? null}
                changed={editor.changed}
                draft
                onAnswer={editor.answer}
              />
            ) : null
          }
        />
      }
    >
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <RackRowCard
            key={row.key}
            row={row}
            image={row.pieceId ? piecesById.get(row.pieceId)?.image : null}
            mark={editor.mark(row.key)}
            styled={editor.rack.styling[row.key]}
            {...(row.proposal ? { onWish: () => editor.wish(row.key) } : {})}
            onSwap={() => setOpened({ swap: row.key })}
            onRemove={() => editor.remove(row.key)}
          />
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setOpened({ add: true })}
        className={`min-h-13 rounded-soft border border-dashed border-border-control text-sm text-ink-muted hover:text-ink ${focus}`}
      >
        {copy.rack.addPiece}
      </button>
      <WardrobeSheet
        opened={opened}
        rows={rows}
        onClose={() => setOpened(null)}
        onPick={(piece) => opened && pick(piece, opened)}
        onSnap={(file) => {
          if (opened) snapFor.current = opened;
          void photo.file(file);
        }}
      />
      <Dialog
        open={editor.full !== null}
        onOpenChange={(o) => {
          if (!o) editor.keep();
        }}
        title={copy.drafts.fullTitle}
        description={copy.drafts.fullBody(editor.full?.oldest ?? copy.draftTile.untitled)}
        footer={
          <>
            <Button variant="quiet" onClick={editor.keep}>
              {copy.drafts.keep}
            </Button>
            <Button variant="primary" onClick={editor.letGo}>
              {copy.drafts.letGo}
            </Button>
          </>
        }
      />
    </DraftLayout>
  );
}

// The one sheet behind a hotspot, the rack's + and a row's swap.
function WardrobeSheet({
  opened,
  rows,
  onClose,
  onPick,
  onSnap,
}: {
  opened: Opened | null;
  rows: readonly { key: string; name: string; category: string; pieceId: string | null }[];
  onClose: () => void;
  onPick: (piece: Piece) => void;
  onSnap: (file: File) => void;
}) {
  const swapRow = opened && 'swap' in opened ? rows.find((r) => r.key === opened.swap) : null;
  const slot = opened && 'slot' in opened ? HOTSPOTS.find((h) => h.slot === opened.slot) : null;
  return (
    <SwapSheet
      open={opened !== null}
      swapping={
        swapRow
          ? { name: swapRow.name, category: swapRow.category, pieceId: swapRow.pieceId }
          : null
      }
      opensOn={slot?.opensOn ?? null}
      {...(slot ? { title: copy.sheet.slot[slot.slot] } : {})}
      onRack={rows.flatMap((r) => (r.pieceId ? [r.pieceId] : []))}
      onClose={onClose}
      instant
      onPick={onPick}
      onSnap={onSnap}
    />
  );
}

function DraftLayout({
  heading = copy.figure.untitled,
  name,
  onName,
  onNameDone,
  onNameCancel,
  count,
  canvas,
  footer,
  children,
}: {
  // The page's heading while she has not named it: "New look" before the first piece.
  heading?: string;
  name: string;
  onName: (v: string) => void;
  onNameDone?: () => void;
  // Escape: back to the name the look had.
  onNameCancel?: () => void;
  count: number;
  canvas: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pb-40 md:pb-0">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="sr-only">{name.trim() || heading}</h1>
        <Eyebrow>{copy.eyebrow.draft}</Eyebrow>
        {/* The title is the name: tap the italic line and write over it. */}
        <InlineTitleField
          value={name}
          label={copy.name.label}
          placeholder={copy.figure.untitled}
          size="lg"
          italic
          align="center"
          autoFocus={false}
          onChange={onName}
          onCommit={() => onNameDone?.()}
          onCancel={onNameCancel}
        />
      </header>
      <figure className="flex flex-col gap-3">
        <Eyebrow>{copy.figure.head(count)}</Eyebrow>
        {canvas}
      </figure>
      {children}
      {footer}
    </div>
  );
}

// Her model on a 4:5 canvas — the render of what she has on once one lands, else the model in her
// base layer — with "+ Top · + Bottom · + Shoes" on the figure; a filled slot reads warm with ✓.
// Her own photograph (`own`) stands without the hotspots: they are drawn for the model's figure.
// The camera bottom-right adds her photograph, ↻ once one is kept (as on the saved look).
function ModelCanvas({
  model,
  pending,
  rendered = null,
  own = false,
  filled,
  chip,
  disabled = false,
  onHotspot,
  photo,
  undressed,
}: {
  model: Model | undefined;
  pending: boolean;
  rendered?: Look | null;
  own?: boolean;
  filled: Set<HotspotSlot>;
  chip: string | null;
  disabled?: boolean;
  onHotspot: (slot: HotspotSlot) => void;
  photo?: { hasPhoto: boolean; label: string; busy: boolean; pick: () => void };
  undressed?: { label: string; onRetry: () => void };
}) {
  const stand = model?.stand?.imageUrl ?? (model?.filed ? model.cell.imageUrl : null);
  return (
    <div className="relative overflow-hidden rounded-crisp border border-hairline">
      {rendered ? (
        <LookImage look={rendered} priority sizes="(min-width: 768px) 448px, 100vw" />
      ) : stand ? (
        // Her model (or Robes' generic one) in the base layer: a signed URL, fixed 4:5.
        // biome-ignore lint/performance/noImgElement: signed catalog URL, fixed 4:5 frame
        <img src={stand} alt={copy.figure.alt} className="aspect-[4/5] w-full object-cover" />
      ) : pending ? (
        <Skeleton className="aspect-[4/5] w-full" />
      ) : (
        <div
          aria-hidden
          className="flex aspect-[4/5] w-full items-center justify-center bg-surface"
        >
          <Icon name="user" size={160} className="text-border-control" />
        </div>
      )}
      {(own ? [] : HOTSPOTS).map((h) => {
        const on = filled.has(h.slot);
        return (
          <button
            key={h.slot}
            type="button"
            disabled={disabled}
            onClick={() => onHotspot(h.slot)}
            style={{ top: h.top }}
            aria-label={copy.figure.slots[h.slot]}
            data-filled={on || undefined}
            className={`absolute left-1/2 min-h-11 -translate-x-1/2 -translate-y-1/2 rounded-pill border px-4 font-sans text-ink text-sm backdrop-blur hover:border-ink ${on ? 'border-selected-line bg-selected' : 'border-hairline bg-surface-raised/90'} ${focus}`}
          >
            {on ? copy.figure.filled[h.slot] : copy.figure.slots[h.slot]}
          </button>
        );
      })}
      {chip ? (
        <span
          role="status"
          className="pointer-events-none absolute top-[44%] left-1/2 -translate-x-1/2 rounded-pill bg-bg/85 px-4 py-2 font-sans text-[10px] text-ink uppercase tracking-[0.2em] backdrop-blur"
        >
          {chip}
        </span>
      ) : null}
      {undressed ? (
        <button
          type="button"
          onClick={undressed.onRetry}
          className={`absolute top-[44%] left-1/2 min-h-11 -translate-x-1/2 rounded-pill border border-hairline bg-bg/90 px-4 font-sans text-ink text-xs backdrop-blur ${focus}`}
        >
          {undressed.label}
        </button>
      ) : null}
      {/* No model of her own yet: the generic one stands in, and the badge is the door. */}
      {own ? null : <GenericModelBadge />}
      {photo ? (
        <button
          type="button"
          onClick={photo.pick}
          disabled={disabled || photo.busy}
          aria-label={photo.label}
          title={photo.label}
          className={`absolute right-3 bottom-3 z-10 flex size-11 items-center justify-center rounded-pill bg-bg/90 text-ink shadow-sm hover:bg-bg disabled:text-ink-faint ${focus}`}
        >
          <Icon name={photo.hasPhoto ? 'swap' : 'camera'} size={17} />
        </button>
      ) : null}
    </div>
  );
}

// Discard · Save, pinned to the foot (legacy .rb-lk-draftbar): fixed on a phone where the dock
// stands down, sticky at the foot of the column on the web. The ✦ floats just above it.
function DraftBar({
  onDiscard,
  onSave,
  canSave,
  saving,
  onAsk,
  asking = false,
  ask = null,
}: {
  onDiscard: () => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
  onAsk?: () => void;
  asking?: boolean;
  ask?: ReactNode;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 md:sticky md:bottom-0 md:-mx-4"
      data-testid="look-bar"
    >
      <div className="mx-auto flex max-w-md flex-col gap-3 px-4">
        {ask}
        {onAsk ? (
          <IconButton
            icon={asking ? 'close' : 'looks'}
            label={copy.figure.prompt}
            onClick={onAsk}
            aria-expanded={asking}
            className="self-end rounded-pill border border-hairline bg-surface-raised shadow-sm"
          />
        ) : null}
      </div>
      <div className="mt-3 border-t border-hairline bg-bg/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur md:pb-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <Button variant="quiet" onClick={onDiscard}>
            {copy.bar.discard}
          </Button>
          <Button variant="primary" disabled={!canSave} loading={saving} onClick={onSave}>
            {copy.bar.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
