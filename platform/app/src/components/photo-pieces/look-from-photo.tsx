'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { LookAnswer, Piece, ReadPiece } from '@robes/contracts';
import { lookbook, looks as looksCopy, photoPieces } from '@robes/copy';
import { sheetL1For } from '@robes/core';
import type { LookCardState } from '@robes/core/photo-pieces';
import { Icon } from '@robes/icons/web';
import {
  Button,
  Dialog,
  ErrorText,
  Eyebrow,
  Heading,
  IconButton,
  Image,
  InlineTitleField,
  Pill,
  Skeleton,
  Text,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { usePhotoRead } from '@/lib/photo-read';
import { PHOTO_ACCEPT } from '@/lib/upload';
import { invalidateWardrobe } from '@/lib/wardrobe';
import { CropThumb, type Natural, PhotoFrame } from './photo-frame';

const copy = photoPieces.look;
const EYEBROW = 'font-sans text-xs font-medium uppercase tracking-[0.2em] text-ink-faint';

interface Card {
  piece: ReadPiece;
  state: LookCardState;
}

const sheetOf = (p: { categoryL2: string | null; category: string }): string =>
  (p.categoryL2 && sheetL1For(p.categoryL2)) || p.category;

// Use case 2b: a look from her photo. Robes reads every piece; each is confirmed (hers, new, or
// left out) before Save; new pieces file to the wardrobe on save with their own crops.
export function LookFromPhoto() {
  const read = usePhotoRead('look_photo');
  const model = useApi('me.model.get');
  const router = useRouter();
  const client = useApiClient();
  const queryClient = useQueryClient();
  const inputId = useId();
  const pieces = useApi('wardrobe.list', { input: { limit: 100 } });
  const mine = useMemo(
    () => new Map((pieces.data?.items ?? []).map((p) => [p.id, p])),
    [pieces.data],
  );
  const [cards, setCards] = useState<Card[] | null>(null);
  const [seenJob, setSeenJob] = useState<string | null>(null);
  const [natural, setNatural] = useState<Natural | null>(null);
  const [finding, setFinding] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [wear, setWear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (read.status === 'done' && read.jobId && seenJob !== read.jobId) {
    setSeenJob(read.jobId);
    setCards(read.pieces.map((piece) => ({ piece, state: { state: 'pending' } })));
  }

  const answer = (index: number, state: LookCardState) =>
    setCards((cs) => (cs ?? []).map((c) => (c.piece.index === index ? { ...c, state } : c)));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!read.jobId || !cards) return;
    setSaving(true);
    setError(null);
    try {
      const look = await client.call('photoReads.look', {
        params: { id: read.jobId },
        input: {
          answers: cards.map(
            ({ piece, state }): LookAnswer =>
              state.state === 'owned'
                ? { index: piece.index, state: 'owned', pieceId: state.pieceId }
                : { index: piece.index, state: state.state === 'new' ? 'new' : 'skip' },
          ),
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(wear ? { wornOn: localToday() } : {}),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') }),
        invalidateWardrobe(queryClient),
      ]);
      router.push(`/look/${look.id}`);
    } catch (err) {
      setError(errorCopy(err));
      setSaving(false);
    }
  }

  if (read.status === 'idle' || read.status === 'failed') {
    return (
      <div className="flex flex-col gap-3 rounded-crisp border border-border-control border-dashed p-6">
        <Heading level={2} size="sm">
          {copy.start.title}
        </Heading>
        <Text size="small" tone="muted">
          {copy.start.body}
        </Text>
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-pill border border-border-control px-6 font-medium font-sans text-ink text-sm hover:border-ink focus-within:outline-2 focus-within:outline-focus-ring focus-within:outline-offset-2"
        >
          <Icon name="camera" size={16} />
          {copy.start.action}
          <input
            id={inputId}
            type="file"
            accept={PHOTO_ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) {
                setCards(null);
                void read.start(f);
              }
            }}
          />
        </label>
        {read.status === 'failed' && read.photoUrl ? (
          // The copy says the photo is kept: show it, so she can judge it herself.
          <Image
            src={read.photoUrl}
            alt={photoPieces.photoAlt}
            aspect="4:5"
            frameClassName="w-40 rounded-crisp"
          />
        ) : null}
        {/* The hook knows WHY it failed — a stalled photo is not a photo it couldn't read. */}
        {read.status === 'failed' ? <ErrorText>{read.error ?? copy.readFailed}</ErrorText> : null}
      </div>
    );
  }

  const reading = read.status === 'reading';
  const list = cards ?? [];
  const pending = list.filter((c) => c.state.state === 'pending');
  const onRack = list.filter((c) => c.state.state === 'owned' || c.state.state === 'new');
  const notice = read.status === 'done' && !list.length ? copy.empty : null;
  // The read happens INSIDE the draft (legacy 2b): the same masthead, the same canvas — her
  // model stands in it while Robes reads, then her photograph takes its place with a dot per
  // piece — and one bar at the foot. It is never a screen of its own.
  return (
    <form onSubmit={save} className="mx-auto flex w-full max-w-md flex-col gap-6 pb-28">
      <header className="flex flex-col items-center gap-2 text-center">
        <Eyebrow>{lookbook.eyebrow.draft}</Eyebrow>
        {/* The draft's masthead, as in the composer; the name rides with Save. */}
        <InlineTitleField
          value={name}
          label={lookbook.name.label}
          placeholder={lookbook.figure.untitled}
          size="lg"
          italic
          align="center"
          autoFocus={false}
          onChange={setName}
        />
      </header>
      <section className="flex flex-col gap-3">
        <Eyebrow>{reading ? copy.headReading : copy.head(onRack.length)}</Eyebrow>
        {read.photoUrl && !reading ? (
          <PhotoFrame
            src={read.photoUrl}
            onNatural={setNatural}
            dots
            tags={pending.map((c) => ({
              index: c.piece.index,
              box: c.piece.box,
              label: c.piece.label,
            }))}
          />
        ) : model.data?.cell.imageUrl ? (
          // biome-ignore lint/performance/noImgElement: signed catalog URL, fixed 4:5 frame
          <img
            src={model.data.cell.imageUrl}
            alt={lookbook.figure.alt}
            className="aspect-[4/5] w-full rounded-soft object-cover"
          />
        ) : (
          <Skeleton className="aspect-[4/5] w-full" />
        )}
        {notice ? (
          <Text role="status" size="small" tone="muted">
            {notice}
          </Text>
        ) : null}
      </section>
      <div className="flex flex-col gap-4">
        {reading ? (
          <div aria-busy className="flex flex-col gap-3">
            <Eyebrow>{copy.reading.eyebrow}</Eyebrow>
            <Heading level={2} size="md">
              {copy.reading.title} <i className="text-accent-inspire">{copy.reading.aside}</i>
            </Heading>
            <Skeleton className="h-20" />
          </div>
        ) : null}
        {onRack.length ? (
          <ul aria-label={looksCopy.look.pieces} className="flex flex-col gap-2">
            {onRack.map((card) => (
              <RackRow
                key={card.piece.index}
                card={card}
                own={card.state.state === 'owned' ? mine.get(card.state.pieceId) : undefined}
                photo={read.photoUrl as string}
                natural={natural}
                onRemove={() => answer(card.piece.index, { state: 'skip' })}
              />
            ))}
          </ul>
        ) : null}
        {pending.length ? (
          <ul aria-label={photoPieces.cards} className="flex flex-col gap-3">
            {pending.map((card) => (
              <ReadCard
                key={card.piece.index}
                card={card}
                own={card.piece.match ? mine.get(card.piece.match.pieceId) : undefined}
                photo={read.photoUrl as string}
                natural={natural}
                onYes={() =>
                  answer(
                    card.piece.index,
                    card.piece.match
                      ? { state: 'owned', pieceId: card.piece.match.pieceId }
                      : { state: 'new' },
                  )
                }
                onFind={() => setFinding(card.piece.index)}
                onLeave={() => answer(card.piece.index, { state: 'skip' })}
              />
            ))}
          </ul>
        ) : null}
        {reading ? null : (
          <>
            <label className="flex items-center gap-3 font-sans text-ink text-sm">
              <input
                type="checkbox"
                checked={wear}
                onChange={(e) => setWear(e.target.checked)}
                className="size-5 accent-ink"
              />
              {copy.wearToday}
            </label>
            {error ? <ErrorText>{error}</ErrorText> : null}
          </>
        )}
      </div>
      {/* One bar at the foot: let the draft go, what is still to answer, and Save. */}
      {reading ? null : (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 md:bottom-6">
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-pill border border-hairline bg-bg/95 p-1.5 pl-4 shadow-sm backdrop-blur">
            <Button variant="quiet" onClick={() => router.push('/looks')}>
              {lookbook.bar.discard}
            </Button>
            {pending.length ? (
              <Text size="small" tone="muted" role="status" className="flex-1 text-center">
                {copy.gate(pending.length)}
              </Text>
            ) : (
              <span className="flex-1" />
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={pending.length > 0}
              loading={saving}
              loadingLabel={copy.saving}
            >
              {copy.save}
            </Button>
          </div>
        </div>
      )}
      <FindIt
        card={finding === null ? undefined : list.find((c) => c.piece.index === finding)}
        pieces={(pieces.data?.items ?? []).filter((p) => p.status === 'ready')}
        taken={onRack.flatMap((c) => (c.state.state === 'owned' ? [c.state.pieceId] : []))}
        onClose={() => setFinding(null)}
        onPick={(state) => {
          if (finding !== null) answer(finding, state);
          setFinding(null);
        }}
      />
    </form>
  );
}

function Thumb({
  own,
  piece,
  photo,
  natural,
}: {
  own: Piece | undefined;
  piece: ReadPiece;
  photo: string;
  natural: Natural | null;
}) {
  return own?.image ? (
    <span className="w-16 shrink-0">
      <PieceImage piece={own} sizes="64px" />
    </span>
  ) : (
    <CropThumb src={photo} box={piece.box} natural={natural} />
  );
}

// A matched piece reads as HER row (Annie's second live pass); a new piece keeps the crop.
function ReadCard({
  card,
  own,
  photo,
  natural,
  onYes,
  onFind,
  onLeave,
}: {
  card: Card;
  own: Piece | undefined;
  photo: string;
  natural: Natural | null;
  onYes(): void;
  onFind(): void;
  onLeave(): void;
}) {
  const { piece } = card;
  const matched = !!piece.match;
  const label = own?.label ?? piece.label;
  const brand = (own ? own.brand : piece.brand)?.trim();
  const matchLabel = own?.label ?? piece.label;
  return (
    <li className="flex flex-col gap-3 rounded-crisp border border-hairline p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-ink font-sans text-bg text-xs">
          {piece.index + 1}
        </span>
        <Thumb own={own} piece={piece} photo={photo} natural={natural} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={EYEBROW}>
            {own ? sheetOf(own) : sheetOf(piece)}
            {brand ? ` · ${brand}` : ''}
            <span className="ml-2 rounded-pill border border-hairline px-1.5">
              {matched ? photoPieces.chip.check : photoPieces.chip.new}
            </span>
          </span>
          <span className="font-sans text-base text-ink">{label}</span>
          <Text as="span" size="small" tone="muted">
            {matched
              ? `${copy.ctxMatch(matchLabel)}${own?.image ? photoPieces.status.ownPhoto : ''}`
              : copy.ctxNew}
          </Text>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Text as="span" size="small" italic className="mr-auto">
          {matched ? copy.askMatch(matchLabel) : copy.askNew}
        </Text>
        <Pill onClick={onYes}>{copy.yes}</Pill>
        <Pill onClick={onFind}>{copy.find}</Pill>
        <Button variant="quiet" onClick={onLeave}>
          {copy.leaveOut}
        </Button>
      </div>
    </li>
  );
}

function RackRow({
  card,
  own,
  photo,
  natural,
  onRemove,
}: {
  card: Card;
  own: Piece | undefined;
  photo: string;
  natural: Natural | null;
  onRemove(): void;
}) {
  const isNew = card.state.state === 'new';
  const label = own?.label ?? card.piece.label;
  const brand = (own ? own.brand : card.piece.brand)?.trim();
  return (
    <li
      data-new={isNew || undefined}
      className="flex items-center gap-3 rounded-crisp bg-surface p-2"
    >
      <Thumb own={own} piece={card.piece} photo={photo} natural={natural} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={EYEBROW}>
          {own ? sheetOf(own) : sheetOf(card.piece)}
          {brand ? ` · ${brand}` : ''}
        </span>
        <span className="font-sans text-base text-ink">{label}</span>
        {isNew ? (
          <Text as="span" size="small" tone="muted">
            {copy.newRow}
          </Text>
        ) : null}
      </span>
      <IconButton icon="close" label={copy.remove(label)} onClick={onRemove} />
    </li>
  );
}

// No, find it: her pieces in that category, and the answer the drawer never had — it’s new.
function FindIt({
  card,
  pieces,
  taken,
  onClose,
  onPick,
}: {
  card: Card | undefined;
  pieces: Piece[];
  taken: string[];
  onClose(): void;
  onPick(state: LookCardState): void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const sheet = card ? sheetOf(card.piece) : '';
  const options = pieces.filter((p) => sheetOf(p) === sheet && !taken.includes(p.id));
  const pick = options.find((p) => p.id === chosen);
  return (
    <Dialog
      open={!!card}
      onOpenChange={(o) => {
        if (!o) {
          setChosen(null);
          onClose();
        }
      }}
      title={card ? copy.findTitle(card.piece.label) : ''}
      description={photoPieces.picker.sub}
      footer={
        <>
          <Button
            variant="primary"
            disabled={!pick}
            onClick={() => {
              if (pick) onPick({ state: 'owned', pieceId: pick.id });
              setChosen(null);
            }}
          >
            {pick ? copy.findGo(pick.label) : copy.findEmpty}
          </Button>
          <Pill
            onClick={() => {
              setChosen(null);
              onPick({ state: 'new' });
            }}
          >
            {copy.findNone}
          </Pill>
        </>
      }
    >
      <ul aria-label={sheet} className="grid max-h-80 grid-cols-3 gap-3 overflow-y-auto">
        {options.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={chosen === p.id}
              onClick={() => setChosen(p.id)}
              className={`flex w-full flex-col gap-1 rounded-crisp p-1 text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus-ring ${chosen === p.id ? 'outline-2 outline-ink' : ''}`}
            >
              <PieceImage piece={p} sizes="120px" />
              <Text as="span" size="small">
                {p.label}
              </Text>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
