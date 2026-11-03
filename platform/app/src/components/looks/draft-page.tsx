'use client';

import { isApiClientError } from '@robes/api-client';
import { useApi, useApiClient } from '@robes/api-client/react';
import type { CreateLookInput, Look, Model, Piece } from '@robes/contracts';
import { lookbook as copy, looks as looksCopy } from '@robes/copy';
import { readsAsThey } from '@robes/core/avatar';
import { noteShort } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import {
  Button,
  Dialog,
  Eyebrow,
  Image,
  InlineTitleField,
  SegmentedControl,
  Skeleton,
  useToast,
} from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { usePushedView } from '@/components/shell/app-shell';
import { useAdjust } from '@/lib/adjust';
import { errorCopy } from '@/lib/error-copy';
import { usePhotoFiling } from '@/lib/file-photo';
import { useLookEditor } from '@/lib/look-editor';
import { useLetGo, useRefreshLooks, useSaveLook } from '@/lib/look-states';
import { AdjustDock } from './adjust-dock';
import { GenericModelBadge } from './generic-model-badge';
import { useHerPhoto } from './her-photo';
import { LookImage } from './look-image';
import { LookMix } from './look-page';
import { RackRowCard } from './rack-row';
import { Scanning } from './scan-line';
import { SwapSheet } from './swap-sheet';
import { lookTags, TagsSheet } from './tags-sheet';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const d = copy.draft;

const draftsFull = (err: unknown): boolean =>
  isApiClientError(err) &&
  err.code === 'conflict' &&
  (err.details as { reason?: string } | undefined)?.reason === 'drafts_full';

const pronoun = (m: Model | undefined) =>
  m?.presence === 'man' ? 'him' : readsAsThey(m?.presence) ? 'them' : 'her';

type Opened = { add: true } | { swap: string };

// The draft look (Front Door design 3b, plan 2026-11-03 §1.3): ONE page for every draft, from the
// prompt box or built by hand — eyebrow, the name, the text block, the picture, the note, the tags
// line, the rack, the "Adjust this look…" dock and Discard · Save. The picture is drawn again only
// when she asks (D3); a draft Robes made is pinned to its day as it is saved (D5). The native twin
// is mobile/src/features/looks/DraftPage.tsx.
export function DraftPage({ look, onSaved }: { look: Look; onSaved?: (look: Look) => void }) {
  usePushedView();
  const router = useRouter();
  const model = useApi('me.model.get');
  const letGo = useLetGo(copy.discarded);
  const [name, setName] = useState(look.nameProvisional ? '' : look.name);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);
  const typed = name.trim() && name.trim() !== look.name ? name.trim() : undefined;
  // A draft Robes made for a day goes onto that day as it is saved; home shows it there.
  const forDay = look.setId ? look.dateHint : null;
  const adjustRef = useRef<ReturnType<typeof useAdjust> | null>(null);
  const editor = useLookEditor(look, { onChange: () => adjustRef.current?.changed() });
  const adjust = useAdjust(look, editor, 'draft');
  adjustRef.current = adjust;
  const save = useSaveLook((saved) => {
    if (forDay) router.push(`/?day=${forDay}&saved=${saved.id}`);
    else onSaved?.(saved);
  });
  const rows = editor.rack.rows;
  const piecesById = new Map(look.pieces.map((p) => [p.piece.id, p.piece]));
  const photo = usePhotoFiling();
  // A photograph filed from the sheet lands where the sheet was opened.
  const snapFor = useRef<Opened>({ add: true });
  const filed = photo.filing.phase === 'filed' ? photo.filing.piece : null;
  useEffect(() => {
    if (!filed) return;
    photo.reset();
    if ('swap' in snapFor.current) editor.swap(snapFor.current.swap, filed);
    else editor.add(filed);
  });
  const reading = photo.filing.phase === 'uploading' || photo.filing.phase === 'reading';
  const herPhoto = useHerPhoto(look);
  const tags = lookTags(look);
  const busy = adjust.busy || save.isPending;

  return (
    <article
      className="mx-auto flex w-full max-w-md flex-col gap-5 pb-48 md:pb-0"
      data-testid="draft-page"
    >
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="sr-only">{name.trim() || look.name}</h1>
        <Eyebrow>{d.eyebrow}</Eyebrow>
        <InlineTitleField
          value={name}
          label={copy.name.label}
          placeholder={look.name || copy.figure.untitled}
          size="lg"
          align="center"
          autoFocus={false}
          onChange={setName}
          onCommit={() => {
            if (typed) editor.rename(typed);
          }}
          onCancel={() => setName(look.nameProvisional ? '' : look.name)}
        />
      </header>
      <LookMix
        yours={rows.filter((r) => r.pieceId).length}
        toFind={rows.filter((r) => r.proposal).length}
        composed={look.composedByRobes}
      />
      <DraftPicture
        look={look}
        model={model.data}
        modelPending={model.isPending}
        stale={adjust.stale}
        badge={adjust.badge}
        redressing={adjust.busy && !adjust.state.asking}
        chip={reading ? copy.figure.reading : null}
        pronoun={pronoun(model.data)}
        photo={herPhoto}
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
      {look.note ? (
        <p className="font-display text-[17px] font-light text-ink-muted italic leading-relaxed">
          {noteShort(look.note)}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3 border-hairline border-t pt-4">
        <p className="font-display text-[15px] font-light text-ink-muted italic">
          {tags.length ? tags.join(' · ') : d.untagged}
        </p>
        <button
          type="button"
          onClick={() => setTagsOpen(true)}
          aria-label={looksCopy.page.editTags}
          className={`relative shrink-0 font-medium font-sans text-[9px] text-ink uppercase tracking-[0.2em] after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] ${focus}`}
        >
          {d.tags}
        </button>
      </div>
      <ul className="flex flex-col gap-2.5">
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
      <AddPiece disabled={busy} onClick={() => setOpened({ add: true })} />
      <WardrobeSheet
        opened={opened}
        rows={rows}
        onClose={() => setOpened(null)}
        onPick={(piece) => {
          if (!opened) return;
          if ('swap' in opened) editor.swap(opened.swap, piece);
          else editor.add(piece);
        }}
        onSnap={(file) => {
          if (opened) snapFor.current = opened;
          void photo.file(file);
        }}
      />
      <TagsSheet look={look} open={tagsOpen} onOpenChange={setTagsOpen} />
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
      <DraftBar
        dock={rows.length ? <AdjustDock adjust={adjust} name={look.name} disabled={busy} /> : null}
        discardLabel={copy.bar.discard}
        onDiscard={() => {
          letGo(look.id);
          router.push(forDay ? `/?day=${forDay}` : '/looks');
        }}
        saveLabel={adjust.busy ? d.tileDressing : copy.bar.save}
        onSave={() => {
          adjust.drawForSave();
          save.mutate({
            params: { id: look.id },
            input: { ...(typed ? { name: typed } : {}), ...(forDay ? { date: forDay } : {}) },
          });
        }}
        canSave={(rows.length > 0 || look.image !== null) && !adjust.busy}
        saving={save.isPending}
      />
    </article>
  );
}

// The dressing lines (design 3b), one at a time while the picture is drawn.
export function useDressingLine(lines: readonly string[], on: boolean): string {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setI((n) => n + 1), 2200);
    return () => clearInterval(t);
  }, [on]);
  return lines[i % lines.length] ?? '';
}

// The picture (design 3b): the look's frame or her model wearing the rack — the model's base
// layer before anything is drawn — on a cream mat. Stale (grayed, with the count she is behind)
// until she asks for the model; scanned while it is drawn; the camera adds her photograph.
function DraftPicture({
  look,
  model,
  modelPending,
  stale,
  badge,
  redressing,
  chip,
  pronoun,
  photo,
}: {
  look: Look;
  model: Model | undefined;
  modelPending: boolean;
  stale: boolean;
  badge: number;
  redressing: boolean;
  chip: string | null;
  pronoun: string;
  photo: ReturnType<typeof useHerPhoto>;
}) {
  const own = look.photo !== null && look.record === 'photo';
  const rendered = own
    ? look
    : look.image
      ? look
      : look.model?.status === 'ready'
        ? { ...look, image: look.model }
        : null;
  const stand = model?.stand?.imageUrl ?? (model?.filed ? model.cell.imageUrl : null);
  const drawing = look.framePending || look.onModel === 'pending' || redressing;
  const line = useDressingLine(
    look.pieces.length || look.setId ? d.linesAgain : d.linesFirst,
    drawing,
  );
  const failed = !drawing && look.onModel === 'failed' && !own;
  return (
    <figure className="flex flex-col gap-1">
      <div className="relative overflow-hidden rounded-[10px] border border-rule-mid bg-surface-sunk">
        <div
          className={`mx-auto w-[84%] transition-[opacity,filter] duration-500 ${stale && !drawing ? 'opacity-80 grayscale-[.75]' : ''} ${drawing ? 'opacity-60' : ''}`}
        >
          {rendered ? (
            <LookImage look={rendered} priority sizes="(min-width: 768px) 380px, 84vw" />
          ) : stand ? (
            <Image src={stand} alt={copy.figure.alt} aspect="4:5" />
          ) : modelPending ? (
            <Skeleton className="aspect-[4/5] w-full" />
          ) : (
            <div
              aria-hidden
              className="flex aspect-[4/5] w-full items-center justify-center bg-surface"
            >
              <Icon name="user" size={160} className="text-border-control" />
            </div>
          )}
        </div>
        {drawing ? <Scanning line={line || d.dressing} corner /> : null}
        {chip ? (
          <span
            role="status"
            className="pointer-events-none absolute top-[44%] left-1/2 -translate-x-1/2 rounded-pill bg-bg/85 px-4 py-2 font-sans text-[10px] text-ink uppercase tracking-[0.2em] backdrop-blur"
          >
            {chip}
          </span>
        ) : null}
        {!drawing && stale && badge ? (
          <span
            title={d.stale}
            className="absolute top-3 left-3 z-10 flex h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-ink px-1.5 font-medium font-sans text-[10px] text-bg"
          >
            <span aria-hidden>{badge}</span>
            <span className="sr-only">{d.behind(badge)}</span>
          </span>
        ) : null}
        {failed ? (
          <span
            role="status"
            className="absolute top-3 left-3 z-10 rounded-pill border border-hairline bg-bg/90 px-3 py-1.5 font-sans text-ink text-xs"
          >
            {copy.figure.undressed(pronoun)}
          </span>
        ) : null}
        {own ? null : <GenericModelBadge />}
        <button
          type="button"
          onClick={photo.pick}
          disabled={photo.busy}
          aria-label={photo.label}
          title={photo.label}
          className={`absolute right-3 bottom-3 z-10 flex size-11 items-center justify-center rounded-pill bg-bg/90 text-ink shadow-sm hover:bg-bg disabled:text-ink-faint ${focus}`}
        >
          <Icon name={photo.hasPhoto ? 'swap' : 'camera'} size={17} />
        </button>
      </div>
    </figure>
  );
}

function AddPiece({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-16 rounded-soft border border-dashed border-selected-line font-sans text-ink-muted text-sm hover:text-ink disabled:text-ink-faint ${focus}`}
    >
      {copy.rack.addPiece}
    </button>
  );
}

// The one sheet behind the rack's + and a row's hanger.
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
  return (
    <SwapSheet
      open={opened !== null}
      swapping={
        swapRow
          ? { name: swapRow.name, category: swapRow.category, pieceId: swapRow.pieceId }
          : null
      }
      onRack={rows.flatMap((r) => (r.pieceId ? [r.pieceId] : []))}
      onClose={onClose}
      instant
      onPick={onPick}
      onSnap={onSnap}
    />
  );
}

// Discard · Save pinned to the foot (legacy .rb-lk-draftbar): fixed on a phone where the dock
// stands down, sticky at the foot of the column on the web. The adjust dock floats above it.
function DraftBar({
  dock,
  discardLabel,
  onDiscard,
  saveLabel,
  onSave,
  canSave,
  saving,
}: {
  dock: ReactNode;
  discardLabel: string;
  onDiscard: () => void;
  saveLabel: string;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 md:sticky md:bottom-0 md:-mx-4"
      data-testid="look-bar"
    >
      {dock ? <div className="mx-auto max-w-md px-4">{dock}</div> : null}
      <div className="mt-3 border-hairline border-t bg-bg/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur md:pb-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <Button variant="quiet" onClick={onDiscard}>
            {discardLabel}
          </Button>
          <Button
            variant="primary"
            disabled={!canSave}
            loading={saving}
            loadingLabel={d.saving}
            onClick={onSave}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Before the first piece (/looks/new): the model in her base layer and the dashed row; the first
// pick makes the draft, which carries on under its own address.
export function NewDraft({ pieceId }: { pieceId?: string }) {
  usePushedView();
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const refresh = useRefreshLooks();
  const model = useApi('me.model.get');
  const [opened, setOpened] = useState(false);
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
  const filed = photo.filing.phase === 'filed' ? photo.filing.piece : null;
  useEffect(() => {
    if (!filed) return;
    photo.reset();
    start(filed);
  });
  const reading = photo.filing.phase === 'uploading' || photo.filing.phase === 'reading';
  const stand = model.data?.stand?.imageUrl ?? null;

  return (
    <article className="mx-auto flex w-full max-w-md flex-col gap-5 pb-48 md:pb-0">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="sr-only">{name.trim() || copy.newLook}</h1>
        <Eyebrow>{d.eyebrow}</Eyebrow>
        <InlineTitleField
          value={name}
          label={copy.name.label}
          placeholder={copy.figure.untitled}
          size="lg"
          align="center"
          autoFocus={false}
          onChange={setName}
        />
      </header>
      <LookMix yours={0} toFind={0} composed={false} />
      <div className="relative overflow-hidden rounded-[10px] border border-rule-mid bg-surface-sunk">
        <div className="mx-auto w-[84%]">
          {stand ? (
            <Image src={stand} alt={copy.figure.alt} aspect="4:5" />
          ) : model.isPending ? (
            <Skeleton className="aspect-[4/5] w-full" />
          ) : (
            <div
              aria-hidden
              className="flex aspect-[4/5] w-full items-center justify-center bg-surface"
            >
              <Icon name="user" size={160} className="text-border-control" />
            </div>
          )}
        </div>
        {reading ? (
          <span
            role="status"
            className="pointer-events-none absolute top-[44%] left-1/2 -translate-x-1/2 rounded-pill bg-bg/85 px-4 py-2 font-sans text-[10px] text-ink uppercase tracking-[0.2em] backdrop-blur"
          >
            {copy.figure.reading}
          </span>
        ) : null}
        <GenericModelBadge />
      </div>
      <AddPiece disabled={busy} onClick={() => setOpened(true)} />
      <Link
        href="/looks/new/photo"
        className={`self-center font-sans text-ink-muted text-sm underline underline-offset-4 hover:text-ink ${focus}`}
      >
        {copy.figure.start.photo}
      </Link>
      <SwapSheet
        open={opened}
        swapping={null}
        onRack={[]}
        onClose={() => setOpened(false)}
        instant
        onPick={start}
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
      <DraftBar
        dock={null}
        discardLabel={copy.bar.discard}
        onDiscard={() => router.push('/looks')}
        saveLabel={copy.bar.save}
        onSave={() => undefined}
        canSave={false}
        saving={busy}
      />
    </article>
  );
}
