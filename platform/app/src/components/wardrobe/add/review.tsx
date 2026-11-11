'use client';

import { trackFiled } from '@robes/analytics';
import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { InboxEntry, PieceValues, ReadPiece, UpdatePieceInput } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { sheetL1For } from '@robes/core';
import {
  type AddDestination,
  bulkGroups,
  fileEdits,
  type RowChanges,
  readDraft,
  reviewScreen,
  rowChanges,
  wishChanges,
  withTagDefaults,
} from '@robes/core/add-flow';
import { shade } from '@robes/core/colour';
import { material } from '@robes/core/material';
import { Icon } from '@robes/icons/web';
import {
  Button,
  buttonClasses,
  ErrorText,
  Heading,
  SubviewHeader,
  Text,
  useToast,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { CropThumb } from '@/components/photo-pieces/photo-frame';
import { PinnedAction } from '@/components/pinned-action';
import {
  isTerminal,
  READ_PATIENCE_MS,
  type SessionShot,
  type ShotSession,
  wardrobeHref,
} from '@/lib/add-flow';
import { invalidateWardrobe } from '@/lib/wardrobe';
import { type PieceField, PieceFieldSheet } from '../piece-field-sheet';
import { RecordRows } from '../piece-rows';

const old = wardrobe.add.review;
const copy = wardrobe.capture.review;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const link = `min-h-11 self-center font-sans text-ink-muted text-[13px] underline underline-offset-[3px] hover:text-ink ${focus}`;
const eyebrow = 'font-medium font-sans text-[9px] text-ink-faint uppercase tracking-[0.2em]';
// How long the toast that follows "Add N to wardrobe" stands (Capture PRD 3c.5).
const ADDED_MS = 2800;

type Found =
  | { kind: 'read'; piece: ReadPiece; photo: SessionShot }
  | { kind: 'link'; item: InboxEntry['items'][number] };

interface Entry {
  key: string;
  group: string;
  index: number;
  found: Found;
  // Robes' read; `category` is the read's own sheet where the taxonomy names none.
  base: PieceValues & { category?: string | null };
}

const sheetOf = (p: { categoryL2: string | null; category: string | null | undefined }) =>
  (p.categoryL2 && sheetL1For(p.categoryL2)) || p.category || '';

const NO_SHOTS: ShotSession = {
  shots: [],
  jobs: new Map(),
  add: async () => {},
  reset: () => {},
  reading: false,
  found: 0,
};

// Review (Capture PRD 3c.3–3c.5; canvas frame 3c): every photograph of the sitting, and a link's
// page, reviewed together. Two or more are a list she removes from and opens a piece out of;
// one is that piece's own page; "Add N to wardrobe" files what is left in one go, each piece once
// with her edits, then the wardrobe opens on them under a toast. Nothing files before that tap.
// Native twin: features/wardrobe/add/Review.tsx.
export function Review({
  to,
  session = NO_SHOTS,
  link: linkId = null,
  onCamera,
  onAnother,
  onFillIn,
}: {
  to: AddDestination;
  session?: ShotSession;
  link?: string | null;
  // Back to the camera with the photographs kept (the back disc, "+ Add another piece", and the
  // last piece removed). Absent where there is no camera behind Review (a link, the camera roll).
  onCamera?: () => void;
  // Back to the Add pieces sheet, the sitting dropped.
  onAnother?: () => void;
  // A read that never lands: the piece by hand, with this photo attached.
  onFillIn?: (shot: SessionShot | undefined) => void;
}) {
  const api = useApiClient();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { track } = useAnalytics().analytics;
  // A link's own entry (links never sit in the Inbox list, which holds receipts).
  const inbox = useApi('inbox.get', { params: { id: linkId ?? '' } }, { enabled: linkId !== null });
  const [removed, setRemoved] = useState<ReadonlySet<string>>(() => new Set());
  const [changes, setChanges] = useState<Record<string, RowChanges>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [field, setField] = useState<PieceField | null>(null);
  const [adding, setAdding] = useState(false);
  const [failed, setFailed] = useState(false);
  // A link's Inbox entry leaves the Inbox once filed, so Review keeps the one it saw.
  const [held, setHeld] = useState<InboxEntry | null>(null);
  const seen = linkId && inbox.data?.id === linkId ? inbox.data : undefined;
  if (seen && !held) setHeld(seen);

  // The pieces, in the order she took the photos and Robes found them.
  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const shot of session.shots) {
      const job = shot.jobId ? session.jobs.get(shot.jobId) : undefined;
      if (!shot.jobId || !isTerminal(job)) continue;
      for (const piece of job.output.readPieces ?? []) {
        out.push({
          key: `${shot.jobId}:${piece.index}`,
          group: shot.jobId,
          index: piece.index,
          found: { kind: 'read', piece, photo: shot },
          base: { ...readDraft(piece), category: piece.category } as Entry['base'],
        });
      }
    }
    for (const item of held?.items ?? []) {
      out.push({
        key: `inbox:${held?.id}:${item.index}`,
        group: `inbox:${held?.id}`,
        index: item.index,
        found: { kind: 'link', item },
        base: readDraft({
          ...item,
          notes: null,
          categoryL2: null,
          categoryL3: null,
          color: null,
        }) as PieceValues,
      });
    }
    return out;
  }, [session.shots, session.jobs, held]);

  // Photographs whose read has not landed: each holds a "Reading the details…" row.
  const readingShots = session.shots.filter(
    (s) => !s.failed && !(s.jobId && isTerminal(session.jobs.get(s.jobId))),
  );
  const linkReading = linkId !== null && !held && inbox.isPending;
  const reading = readingShots.length + (linkReading ? 1 : 0);
  const kept = entries.filter((e) => !removed.has(e.key));
  const screen = reviewScreen({ keys: kept.map((e) => e.key), reading, open });

  // A read that takes too long offers the piece by hand (redline 01).
  const waiting = reading > 0 && kept.length === 0;
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!waiting) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), READ_PATIENCE_MS);
    return () => window.clearTimeout(timer);
  }, [waiting]);

  // The last piece removed: back to the camera with nothing in hand (3c.3).
  const emptied = screen.kind === 'camera' && entries.length > 0;
  useEffect(() => {
    if (!emptied) return;
    session.reset();
    (onCamera ?? onAnother)?.();
  }, [emptied, onAnother, onCamera, session]);

  const remove = (key: string) => {
    setRemoved((r) => new Set(r).add(key));
    setOpen(null);
  };
  const valuesOf = (e: Entry): PieceValues => ({ ...e.base, ...changes[e.key] }) as PieceValues;

  async function addAll() {
    if (adding || reading > 0 || kept.length === 0) return;
    setAdding(true);
    setFailed(false);
    try {
      for (const { group, answers } of bulkGroups(entries, removed, changes)) {
        const labelOf = (i: number) =>
          entries.find((e) => e.group === group && e.index === i)?.base.label ?? '';
        if (group.startsWith('inbox:')) {
          const id = group.slice('inbox:'.length);
          const keep = answers.filter((a) => a.state === 'add');
          const decision = await api.call('inbox.decide', {
            params: { id },
            input: keep.length
              ? { action: to, itemIndexes: keep.map((a) => a.index) }
              : { action: 'dismiss' },
          });
          await Promise.all(
            keep.map((a, i) => {
              const pieceId = decision.filedIds[i];
              if (!pieceId || !a.edits) return null;
              return to === 'wishlist'
                ? api.call('wishlist.update', {
                    params: { id: pieceId },
                    input: wishChanges(a.edits),
                  })
                : api.call('wardrobe.update', { params: { id: pieceId }, input: a.edits });
            }),
          );
          await queryClient.invalidateQueries({ queryKey: queryKeys.route('inbox.list') });
        } else {
          await api.call('photoReads.file', {
            params: { id: group },
            input: {
              to,
              answers: answers.map((a) =>
                a.state === 'add'
                  ? {
                      index: a.index,
                      state: 'add' as const,
                      edits: fileEdits(labelOf(a.index), a.edits ?? {}),
                    }
                  : { index: a.index, state: 'skip' as const },
              ),
            },
          });
        }
        trackFiled(track, group.startsWith('inbox:') ? 'link' : 'photo', answers, to);
      }
      if (to === 'wishlist') {
        await queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') });
      } else {
        await invalidateWardrobe(queryClient);
      }
      toast({ message: wardrobe.capture.added(kept.length, to), duration: ADDED_MS });
      router.push(wardrobeHref(to));
    } catch {
      // Each piece files once, so trying again files only what is left.
      setFailed(true);
      setAdding(false);
    }
  }

  const back = onCamera ?? onAnother ?? (() => router.push(`/wardrobe/add?to=${to}`));
  const another = onCamera ? (
    <button type="button" onClick={onCamera} className={link} data-testid="review-another">
      {copy.another}
    </button>
  ) : null;
  const addButton = (
    <Button
      variant="primary"
      block
      disabled={adding || reading > 0 || kept.length === 0}
      aria-busy={adding}
      onClick={() => void addAll()}
      data-testid="review-add"
    >
      {adding ? copy.adding : copy.add(kept.length + reading, to)}
    </Button>
  );
  const problem = failed ? <ErrorText>{old.failed}</ErrorText> : null;
  const header = (title: string, onBack: () => void) => (
    <div className="-mx-4 md:mx-0">
      <SubviewHeader
        title={title}
        back={
          <button
            type="button"
            aria-label={copy.back}
            onClick={onBack}
            data-testid="review-back"
            className={`flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted ${focus}`}
          >
            <Icon name="back" size={15} />
          </button>
        }
      />
    </div>
  );

  // Nothing found, and nothing still reading: the photo by hand.
  if (screen.kind === 'camera') {
    if (entries.length > 0) return null;
    const latest = session.shots.at(-1);
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4" data-testid="review-unread">
        {header(copy.title, back)}
        <Heading level={2} size="lg" role="status">
          {old.unread}
        </Heading>
        <Text tone="muted">{session.shots.some((s) => s.failed) ? old.stalled : old.nothing}</Text>
        <FillIn to={to} shot={latest} onFillIn={onFillIn} />
      </div>
    );
  }

  if (screen.kind === 'list') {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4" data-testid="review-list">
        {header(copy.title, back)}
        <div className="flex flex-col gap-2 pt-2">
          <Heading level={2} size="lg">
            {copy.head(screen.count)}
          </Heading>
          <Text size="small" tone="muted">
            {copy.sub}
          </Text>
        </div>
        <ul className="overflow-hidden rounded-card border-[0.5px] border-rule-mid bg-surface-raised">
          {kept.map((e) => (
            <ReviewRow
              key={e.key}
              entry={e}
              values={valuesOf(e)}
              onOpen={() => setOpen(e.key)}
              onRemove={() => remove(e.key)}
            />
          ))}
          {readingShots.map((shot) => (
            <ReadingRow key={shot.key} shot={shot} />
          ))}
          {linkReading ? <ReadingRow shot={null} /> : null}
        </ul>
        {another}
        {problem}
        <PinnedAction>{addButton}</PinnedAction>
      </div>
    );
  }

  // One piece: the sitting's only one, or one opened from the list.
  const entry = kept.find((e) => e.key === screen.key);
  const single = screen.kind === 'single';
  const values = entry ? withTagDefaults(valuesOf(entry)) : null;
  const shot = entry?.found.kind === 'read' ? entry.found.photo : (readingShots[0] ?? null);
  const blank = {
    ...readDraft({
      label: '',
      brand: null,
      notes: null,
      categoryL2: null,
      categoryL3: null,
      color: null,
    }),
    category: null,
  } as PieceValues;
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4" data-testid="review-piece">
      {header(
        single
          ? copy.one
          : copy.of(
              screen.kind === 'piece' ? screen.at : 1,
              screen.kind === 'piece' ? screen.of : 1,
            ),
        single ? back : () => setOpen(null),
      )}
      <div className="flex justify-center pt-2">
        {shot ? (
          <CropThumb
            src={shot.url}
            box={entry?.found.kind === 'read' ? entry.found.piece.box : { x: 0, y: 0, w: 1, h: 1 }}
            natural={shot}
            className="h-[320px] w-[236px] shadow-row"
          />
        ) : (
          <span className="block h-[320px] w-[236px] rounded-[3px] bg-surface-sunk" />
        )}
      </div>
      <section className="flex flex-col gap-2" aria-label={copy.piece}>
        <h2 className={eyebrow}>{copy.piece}</h2>
        <RecordRows
          values={values ?? blank}
          onField={setField}
          withName
          only="piece"
          reading={!values}
        />
      </section>
      <section className="flex flex-col gap-2" aria-label={copy.colour}>
        <h2 className={eyebrow}>{copy.colour}</h2>
        <RecordRows values={values ?? blank} onField={setField} only="colour" reading={!values} />
      </section>
      <Text size="small" tone="muted" className="text-center">
        {copy.footnote}
      </Text>
      {!values && slow ? <FillIn to={to} shot={session.shots.at(-1)} onFillIn={onFillIn} /> : null}
      {single ? (
        another
      ) : entry ? (
        <button
          type="button"
          onClick={() => remove(entry.key)}
          data-testid="review-remove-piece"
          className={`min-h-11 self-center font-sans text-[13px] text-danger underline underline-offset-[3px] ${focus}`}
        >
          {copy.removePiece}
        </button>
      ) : null}
      {problem}
      <PinnedAction>
        {single ? (
          addButton
        ) : (
          <Button variant="primary" block onClick={() => setOpen(null)} data-testid="review-done">
            {copy.done}
          </Button>
        )}
      </PinnedAction>
      {entry && values ? (
        <PieceFieldSheet
          piece={values}
          field={field}
          onClose={() => setField(null)}
          onSave={(input: UpdatePieceInput) =>
            setChanges((c) => ({ ...c, [entry.key]: { ...c[entry.key], ...rowChanges(input) } }))
          }
          saving={false}
        />
      ) : null}
    </div>
  );
}

// One piece on the list (3c.3): its crop, the category in small caps, the name in the serif,
// then Colour · Material · Brand, or "Add the details" when the read saw none of them. The row
// opens the piece; × removes it.
function ReviewRow({
  entry,
  values,
  onOpen,
  onRemove,
}: {
  entry: Entry;
  values: PieceValues;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const label = values.label || copy.piece;
  const sub =
    [shade(values.colourShade)?.name, material(values.material)?.name, values.brand]
      .filter(Boolean)
      .join(' · ') || copy.details;
  return (
    <li
      className="relative flex min-h-[76px] items-center gap-3.5 border-rule border-t-[0.5px] px-3 first:border-t-0"
      data-testid="review-row"
    >
      {entry.found.kind === 'read' ? (
        <CropThumb
          src={entry.found.photo.url}
          box={entry.found.piece.box}
          natural={entry.found.photo}
          className="h-[55px] w-11"
        />
      ) : (
        <span className="block h-[55px] w-11 shrink-0 rounded-[3px] bg-surface-sunk" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`truncate ${eyebrow} tracking-[0.18em]`}>
          {sheetOf({ categoryL2: values.categoryL2, category: entry.base.category })}
        </span>
        <button
          type="button"
          onClick={onOpen}
          aria-label={copy.open(label)}
          className={`truncate text-left font-display text-[17px] text-ink leading-[1.25] after:absolute after:inset-0 ${focus}`}
        >
          {label}
        </button>
        <span className="truncate font-sans text-[12px] text-ink-faint">{sub}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={copy.remove(label)}
        title={copy.remove(label)}
        className={`relative z-10 flex size-11 shrink-0 items-center justify-center rounded-pill ${focus}`}
      >
        <span className="flex size-[30px] items-center justify-center rounded-pill bg-surface-sunk text-ink-muted">
          <Icon name="close" size={12} />
        </span>
      </button>
      <Icon name="forward" size={14} className="shrink-0 text-ink-faint" />
    </li>
  );
}

// A photograph still being read: its thumbnail, and "Reading the details…" breathing.
function ReadingRow({ shot }: { shot: SessionShot | null }) {
  return (
    <li
      className="flex min-h-[76px] items-center gap-3.5 border-rule border-t-[0.5px] px-3 first:border-t-0 motion-safe:animate-breathe"
      data-testid="review-reading"
    >
      {shot ? (
        // biome-ignore lint/performance/noImgElement: a local object URL of her own photo
        <img src={shot.url} alt="" className="h-[55px] w-11 shrink-0 rounded-[3px] object-cover" />
      ) : (
        <span className="block h-[55px] w-11 shrink-0 rounded-[3px] bg-surface-sunk" />
      )}
      <span role="status" className="flex-1 font-sans text-[13px] text-ink-faint">
        {copy.reading}
      </span>
    </li>
  );
}

function FillIn({
  to,
  shot,
  onFillIn,
}: {
  to: AddDestination;
  shot: SessionShot | undefined;
  onFillIn?: ((shot: SessionShot | undefined) => void) | undefined;
}) {
  const pill = buttonClasses({ variant: 'outline' });
  return onFillIn ? (
    <button type="button" className={`${pill} self-start`} onClick={() => onFillIn(shot)}>
      {old.fillIn}
    </button>
  ) : (
    <Link href={`/wardrobe/manual?to=${to}`} className={`${pill} self-start`}>
      {old.fillIn}
    </Link>
  );
}
