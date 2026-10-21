'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { FileReadOutput, Piece, ReadPiece, ReadPieceEdits } from '@robes/contracts';
import { photoPieces as copy, wardrobe as wardrobeCopy } from '@robes/copy';
import { sheetL1For } from '@robes/core';
import {
  answerCard,
  likelyDuplicate,
  pieceWord,
  type WardrobeCardState,
  wardrobeSummary,
} from '@robes/core/photo-pieces';
import { Icon } from '@robes/icons/web';
import {
  Button,
  buttonClasses,
  Dialog,
  Eyebrow,
  Field,
  Heading,
  Pill,
  Skeleton,
  Text,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { errorCopy } from '@/lib/error-copy';
import { usePhotoRead } from '@/lib/photo-read';
import { PHOTO_ACCEPT } from '@/lib/upload';
import { CropThumb, type Natural, PhotoFrame } from './photo-frame';

type CardState = WardrobeCardState<ReadPieceEdits>;

interface Card {
  piece: ReadPiece;
  // Her piece Robes matched (at the duplicate threshold) or she pointed at.
  dupId: string | null;
  state: CardState;
}

// Eyebrow's look as a span (a <p> can't sit inside the card's button).
const EYEBROW = 'font-sans text-xs font-medium uppercase tracking-[0.2em] text-ink-faint';

function sheetOf(p: { categoryL2: string | null; category: string }): string {
  return (p.categoryL2 && sheetL1For(p.categoryL2)) || p.category;
}

// Use case 3 (legacy "Here’s what Robes saw"): several pieces from one photo, each confirmed by
// a question and two answers, each filed on its own with its own crop.
export function WardrobePieces() {
  const read = usePhotoRead('wardrobe');
  const [cards, setCards] = useState<Card[] | null>(null);
  const [seenJob, setSeenJob] = useState<string | null>(null);
  const [natural, setNatural] = useState<Natural | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [filing, setFiling] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [filed, setFiled] = useState<FileReadOutput | null>(null);
  const client = useApiClient();
  const queryClient = useQueryClient();
  const inputId = useId();
  const pieces = useApi('wardrobe.list', { input: { limit: 100 } });
  const mine = useMemo(
    () => new Map((pieces.data?.items ?? []).map((p) => [p.id, p])),
    [pieces.data],
  );

  // The read lands once per job: every piece starts pending.
  if (read.status === 'done' && read.jobId && seenJob !== read.jobId) {
    setSeenJob(read.jobId);
    setCards(
      read.pieces.map((piece) => ({
        piece,
        dupId: likelyDuplicate(piece.match),
        state: { state: 'pending' },
      })),
    );
  }

  const setState = (index: number, state: CardState, dupId?: string | null) =>
    setCards((cs) =>
      (cs ?? []).map((c) =>
        c.piece.index === index ? { ...c, state, ...(dupId !== undefined ? { dupId } : {}) } : c,
      ),
    );

  async function file() {
    if (!cards || !read.jobId) return;
    setFiling(true);
    setFileError(null);
    try {
      const out = await client.call('photoReads.file', {
        params: { id: read.jobId },
        input: {
          answers: cards.map(({ piece, state }) =>
            state.state === 'add'
              ? { index: piece.index, state: 'add', ...(state.edits ? { edits: state.edits } : {}) }
              : state.state === 'owned'
                ? { index: piece.index, state: 'owned', pieceId: state.pieceId }
                : { index: piece.index, state: 'skip' },
          ),
        },
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
      setFiled(out);
    } catch (err) {
      setFileError(errorCopy(err));
    } finally {
      setFiling(false);
    }
  }

  if (filed && cards && read.photoUrl) {
    return <Filed out={filed} cards={cards} photo={read.photoUrl} natural={natural} mine={mine} />;
  }

  if (
    read.status === 'idle' ||
    read.status === 'failed' ||
    (read.status === 'done' && !cards?.length)
  ) {
    const message =
      read.status === 'failed' ? read.error : read.status === 'done' ? copy.none : null;
    return (
      <div className="flex flex-col gap-4">
        <label
          htmlFor={inputId}
          className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-crisp border border-border-control border-dashed px-6 text-center focus-within:outline-2 focus-within:outline-focus-ring focus-within:outline-offset-2"
        >
          <Icon name="camera" size={28} className="text-ink-muted" />
          <span className="font-sans text-base text-ink">{copy.door.choose}</span>
          <span className="font-sans text-ink-muted text-sm">{copy.door.body}</span>
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
                setFiled(null);
                void read.start(f);
              }
            }}
          />
        </label>
        {message ? (
          <Text role="alert" size="small" tone="danger">
            {message}
          </Text>
        ) : null}
      </div>
    );
  }

  if (read.status === 'reading' || !cards || !read.photoUrl) {
    return (
      <div aria-busy className="flex flex-col gap-4">
        <Heading level={2} size="md">
          {copy.reading.title}
        </Heading>
        <Text tone="muted" role="status">
          {copy.reading.body}
        </Text>
        {read.photoUrl ? <PhotoFrame src={read.photoUrl} tags={[]} onNatural={setNatural} /> : null}
        <Skeleton className="h-20" />
      </div>
    );
  }

  const open = editing === null ? null : cards.find((c) => c.piece.index === editing);
  if (open) {
    return (
      <PieceEditor
        card={open}
        photo={read.photoUrl}
        natural={natural}
        onBack={() => setEditing(null)}
        onConfirm={(edits) => {
          setState(open.piece.index, { state: 'add', edits });
          setEditing(null);
        }}
      />
    );
  }

  const sum = wardrobeSummary(cards.map((c) => c.state));
  const pending = cards.filter((c) => c.state.state === 'pending');
  const cta = sum.toAdd
    ? copy.cta.add(sum.toAdd)
    : sum.pending
      ? copy.cta.waiting
      : sum.owned
        ? copy.cta.keepPhoto
        : copy.cta.nothing;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Heading level={2} size="md">
          {sum.pending ? copy.saw.title : copy.answered.title(sum.toAdd, sum.owned)}
        </Heading>
        <Text size="small" tone="muted">
          {sum.pending ? copy.saw.body(cards.length) : copy.answered.body}
        </Text>
      </div>
      <PhotoFrame
        src={read.photoUrl}
        onNatural={setNatural}
        tags={pending.map((c) => ({
          index: c.piece.index,
          box: c.piece.box,
          label: pieceWord(c.piece),
        }))}
      />
      <ul aria-label={copy.cards} className="flex flex-col gap-3">
        {cards.map((card) => (
          <PieceCard
            key={card.piece.index}
            card={card}
            own={card.dupId ? mine.get(card.dupId) : undefined}
            photo={read.photoUrl as string}
            natural={natural}
            onOpen={() =>
              card.dupId && card.state.state !== 'add'
                ? setViewing(card.dupId)
                : setEditing(card.piece.index)
            }
            onAnswer={(answer) => {
              const next = answerCard<ReadPieceEdits>(card.dupId, answer);
              setState(card.piece.index, next);
              // "No, add it" on a likely duplicate is a piece Robes read wrong: the editor opens.
              if (card.dupId && answer === 'no') setEditing(card.piece.index);
            }}
            onMine={() => setPicking(card.piece.index)}
          />
        ))}
      </ul>
      {fileError ? (
        <Text role="alert" size="small" tone="danger">
          {fileError}
        </Text>
      ) : null}
      <Button
        variant="primary"
        block
        disabled={sum.pending > 0 || (!sum.toAdd && !sum.owned)}
        loading={filing}
        loadingLabel={copy.cta.filing}
        onClick={() => void file()}
      >
        {cta}
      </Button>
      <PieceRecord
        piece={viewing ? mine.get(viewing) : undefined}
        onClose={() => setViewing(null)}
      />
      <WardrobePicker
        open={picking !== null}
        pieces={(pieces.data?.items ?? []).filter((p) => p.status === 'ready')}
        onClose={() => setPicking(null)}
        onPick={(id) => {
          if (picking !== null) setState(picking, { state: 'owned', pieceId: id }, id);
          setPicking(null);
        }}
      />
    </div>
  );
}

function PieceCard({
  card,
  own,
  photo,
  natural,
  onOpen,
  onAnswer,
  onMine,
}: {
  card: Card;
  own: Piece | undefined;
  photo: string;
  natural: Natural | null;
  onOpen(): void;
  onAnswer(answer: 'yes' | 'no'): void;
  onMine(): void;
}) {
  const { piece, state, dupId } = card;
  // A matched piece reads as HER row (its photo, brand, category); the crop only stands in
  // when her row has no photograph, or when she's adding it as a new piece.
  const row = dupId && state.state !== 'add' ? own : undefined;
  const edits = state.state === 'add' ? state.edits : undefined;
  const label = row?.label ?? edits?.label ?? piece.label;
  const brand = (row ? row.brand : (edits?.brand ?? piece.brand))?.trim() || null;
  const sheet = row ? sheetOf(row) : sheetOf(piece);
  const status =
    state.state === 'add'
      ? copy.status.toAdd
      : state.state === 'skip'
        ? copy.status.skipped
        : state.state === 'owned'
          ? own && !own.image
            ? copy.status.ownedPhoto
            : copy.status.owned
          : dupId
            ? `${copy.status.looksLikeYours}${row?.image ? copy.status.ownPhoto : ''}`
            : (piece.color ?? '');
  return (
    <li
      data-state={state.state}
      className={`flex flex-col gap-3 rounded-crisp border border-hairline p-3 ${state.state === 'owned' || state.state === 'skip' ? 'opacity-70' : ''}`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={copy.open(piece.index + 1)}
        className="flex items-center gap-3 text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus-ring"
      >
        {state.state === 'pending' ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-ink font-sans text-bg text-xs">
            {piece.index + 1}
          </span>
        ) : null}
        {row?.image ? (
          <span className="w-16 shrink-0">
            <PieceImage piece={row} sizes="64px" />
          </span>
        ) : (
          <CropThumb src={photo} box={piece.box} natural={natural} />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={EYEBROW}>
            {sheet} · {brand ?? copy.unlabelled}
            {state.state === 'pending' ? (
              <span className="ml-2 rounded-pill border border-hairline px-1.5">
                {dupId ? copy.chip.check : copy.chip.new}
              </span>
            ) : null}
          </span>
          <span className="font-sans text-base text-ink">{label}</span>
          <Text as="span" size="small" tone="muted">
            {status}
          </Text>
        </span>
        <Icon name="forward" size={18} className="text-ink-muted" />
      </button>
      {state.state === 'pending' ? (
        <div className="flex flex-wrap items-center gap-2">
          <Text as="span" size="small" italic className="mr-auto">
            {dupId ? copy.ask.yours : copy.ask.add}
          </Text>
          <Pill onClick={() => onAnswer('yes')}>{copy.ask.yes}</Pill>
          <Pill onClick={() => onAnswer('no')}>{dupId ? copy.ask.addIt : copy.ask.skip}</Pill>
          {dupId ? null : (
            <Button variant="quiet" onClick={onMine}>
              {copy.ask.mine}
            </Button>
          )}
        </div>
      ) : null}
    </li>
  );
}

// › on a new piece: the single-piece screen scoped to it; "Add this piece" confirms and returns.
function PieceEditor({
  card,
  photo,
  natural,
  onBack,
  onConfirm,
}: {
  card: Card;
  photo: string;
  natural: Natural | null;
  onBack(): void;
  onConfirm(edits: ReadPieceEdits): void;
}) {
  const start = card.state.state === 'add' ? card.state.edits : undefined;
  const [label, setLabel] = useState(start?.label ?? card.piece.label);
  const [brand, setBrand] = useState(start?.brand ?? card.piece.brand ?? '');
  const [color, setColor] = useState(start?.color ?? card.piece.color ?? '');
  const [size, setSize] = useState(start?.size ?? '');
  const [notes, setNotes] = useState(start?.notes ?? card.piece.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError(copy.piece.nameFirst);
      return;
    }
    onConfirm({
      label: label.trim(),
      brand: brand.trim() || null,
      color: color.trim() || null,
      size: size.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="quiet" onClick={onBack}>
          {copy.piece.back}
        </Button>
        <Text as="span" size="small" tone="muted">
          {copy.piece.crumb(card.piece.index + 1)}
        </Text>
      </div>
      <CropThumb src={photo} box={card.piece.box} natural={natural} className="mx-auto size-48" />
      <Heading level={2} size="md">
        {card.piece.label}
      </Heading>
      <Field
        label={wardrobeCopy.piece.label}
        value={label}
        maxLength={120}
        error={error}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Field
        label={wardrobeCopy.piece.brand}
        value={brand}
        maxLength={80}
        onChange={(e) => setBrand(e.target.value)}
      />
      <Field
        label={wardrobeCopy.piece.color}
        value={color}
        maxLength={60}
        onChange={(e) => setColor(e.target.value)}
      />
      <Field
        label={wardrobeCopy.piece.size}
        value={size}
        maxLength={40}
        onChange={(e) => setSize(e.target.value)}
      />
      <Field
        label={wardrobeCopy.piece.notes}
        value={notes}
        maxLength={1000}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button type="submit" variant="primary" block>
        {copy.piece.confirm}
      </Button>
    </form>
  );
}

// › on a piece that is hers: its saved record, never the editor; closing lands back on the list.
function PieceRecord({ piece, onClose }: { piece: Piece | undefined; onClose(): void }) {
  return (
    <Dialog
      open={!!piece}
      onOpenChange={(o) => (o ? null : onClose())}
      title={piece?.label ?? ''}
      description={piece ? `${sheetOf(piece)}${piece.brand ? ` · ${piece.brand}` : ''}` : undefined}
    >
      {piece ? (
        <div className="flex flex-col gap-3">
          <div className="mx-auto w-48">
            <PieceImage piece={piece} sizes="192px" />
          </div>
          <Link href={`/piece/${piece.id}`} className={buttonClasses({ variant: 'quiet' })}>
            {wardrobeCopy.edit}
          </Link>
        </div>
      ) : null}
    </Dialog>
  );
}

// "Already mine ›": she points at the piece Robes missed.
function WardrobePicker({
  open,
  pieces,
  onClose,
  onPick,
}: {
  open: boolean;
  pieces: Piece[];
  onClose(): void;
  onPick(id: string): void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? null : onClose())}
      title={copy.picker.title}
      description={copy.picker.sub}
    >
      <ul
        aria-label={copy.picker.title}
        className="grid max-h-96 grid-cols-3 gap-3 overflow-y-auto"
      >
        {pieces.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onPick(p.id)}
              className="flex w-full flex-col gap-1 rounded-crisp p-1 text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus-ring"
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

// 4.4: each piece filed on its own, cut from the same photo.
function Filed({
  out,
  cards,
  photo,
  natural,
  mine,
}: {
  out: FileReadOutput;
  cards: Card[];
  photo: string;
  natural: Natural | null;
  mine: Map<string, Piece>;
}) {
  const kept = cards.filter((c) => c.state.state === 'add');
  const owned = cards.flatMap((c) => (c.state.state === 'owned' ? [c.state.pieceId] : []));
  const lines = owned
    .map((id) => {
      const own = mine.get(id);
      return own ? copy.filed.owned(own.label, out.photoAdded.includes(id)) : null;
    })
    .filter(Boolean)
    .join(' ');
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Heading level={2} size="md">
          {copy.filed.title(out.filed.length)}
        </Heading>
        <Text size="small" tone="muted">
          {copy.filed.body(out.filed.length)}
        </Text>
      </div>
      <ul
        aria-label={wardrobeCopy.segments.pieces}
        className="grid grid-cols-2 gap-3 md:grid-cols-3"
      >
        {out.filed.map((piece, i) => {
          const card = kept[i];
          return (
            <li key={piece.id} className="flex flex-col gap-1">
              {card ? (
                <CropThumb
                  src={photo}
                  box={card.piece.box}
                  natural={natural}
                  className="aspect-square w-full"
                />
              ) : null}
              <Eyebrow>{copy.filed.tile(sheetOf(piece))}</Eyebrow>
              <Text as="span">{piece.label}</Text>
            </li>
          );
        })}
      </ul>
      {lines ? <Text size="small">{lines}</Text> : null}
      <Link href="/wardrobe" className={buttonClasses({ variant: 'secondary', block: true })}>
        {copy.filed.back}
      </Link>
    </div>
  );
}
