'use client';

import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import type { InboxEntry, PieceValues, ReadPiece, UpdatePieceInput } from '@robes/contracts';
import { ui, wardrobe } from '@robes/copy';
import { sheetL1For } from '@robes/core';
import {
  type AddDestination,
  fileEdits,
  nextPending,
  type ReviewEntry,
  type RowChanges,
  readDraft,
  readyGroups,
  reviewTally,
  rowChanges,
  SCAN_READY_STEP,
  SCAN_STEP_MS,
  SCAN_STEPS,
  scanTags,
  wishChanges,
} from '@robes/core/add-flow';
import { shade } from '@robes/core/colour';
import { pieceWord } from '@robes/core/photo-pieces';
import { Button, buttonClasses, ErrorText, Eyebrow, Heading, Skeleton, Text } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CropThumb } from '@/components/photo-pieces/photo-frame';
import { isTerminal, type SessionShot, type ShotSession, wardrobeHref } from '@/lib/add-flow';
import { invalidateWardrobe } from '@/lib/wardrobe';
import { type PieceField, PieceFieldSheet } from '../piece-field-sheet';
import { RecordRows } from '../piece-rows';
import { ScanPhoto, type ScanSource } from './scan-photo';

const copy = wardrobe.add;

type Found =
  | { kind: 'read'; piece: ReadPiece; photo: SessionShot }
  | { kind: 'link'; item: InboxEntry['items'][number] };

type Entry = ReviewEntry<RowChanges> & { found: Found; base: PieceValues };

const sheetOf = (p: { categoryL2: string | null; category: string }) =>
  (p.categoryL2 && sheetL1For(p.categoryL2)) || p.category;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', on);
    return () => query.removeEventListener('change', on);
  }, []);
  return reduced;
}

const NO_SHOTS: ShotSession = {
  shots: [],
  jobs: new Map(),
  add: async () => {},
  reset: () => {},
  reading: false,
  found: 0,
};

// Review (design "Add Piece — Handoff"): every way in lands here, one piece at a time, and
// nothing files without a look. The scan plays, the rows resolve from "Reading…", any row opens
// its drawer, and the one ink button files the piece and walks on to the next. A read files once
// all its pieces are answered (its spare crops are let go); a link files on its own. When the
// last piece is answered, Filed says how many. Native twin: features/wardrobe/add/Review.tsx.
export function Review({
  to,
  session = NO_SHOTS,
  link = null,
  onRetake,
  onAnother,
}: {
  to: AddDestination;
  session?: ShotSession;
  link?: string | null;
  // One photo can be taken again; more than one is reviewed as it is.
  onRetake?: () => void;
  // Back to the Add pieces sheet in place, where Review shares its page with it.
  onAnother?: () => void;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const reduced = useReducedMotion();
  const inbox = useApi('inbox.list', undefined, { enabled: link !== null });
  const [answers, setAnswers] = useState<
    Record<string, { answer: 'add' | 'skip'; edits?: RowChanges }>
  >({});
  const [changes, setChanges] = useState<Record<string, RowChanges>>({});
  const [current, setCurrent] = useState<string | null>(null);
  const [field, setField] = useState<PieceField | null>(null);
  const [step, setStep] = useState(0);
  const [filed, setFiled] = useState<Set<string>>(() => new Set());
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const filing = useRef(new Set<string>());
  // A link's Inbox entry leaves the Inbox once filed, so Review keeps the one it saw.
  const [held, setHeld] = useState<InboxEntry | null>(null);
  const seen = link ? inbox.data?.items.find((e) => e.id === link) : undefined;
  if (seen && !held) setHeld(seen);

  // The queue, in the order she took the photos and Robes found the pieces.
  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    for (const shot of session.shots) {
      const job = shot.jobId ? session.jobs.get(shot.jobId) : undefined;
      if (!shot.jobId || !isTerminal(job)) continue;
      for (const piece of job.output.readPieces ?? []) {
        const key = `${shot.jobId}:${piece.index}`;
        out.push({
          key,
          group: shot.jobId,
          index: piece.index,
          answer: answers[key]?.answer ?? 'pending',
          ...(answers[key]?.edits ? { edits: answers[key].edits } : {}),
          found: { kind: 'read', piece, photo: shot },
          base: readDraft(piece),
        });
      }
    }
    for (const item of held?.items ?? []) {
      const key = `inbox:${held?.id}:${item.index}`;
      out.push({
        key,
        group: `inbox:${held?.id}`,
        index: item.index,
        answer: answers[key]?.answer ?? 'pending',
        ...(answers[key]?.edits ? { edits: answers[key].edits } : {}),
        found: { kind: 'link', item },
        base: readDraft({ ...item, notes: null, categoryL2: null, categoryL3: null, color: null }),
      });
    }
    return out;
  }, [session.shots, session.jobs, held, answers]);

  const at = current ? entries.findIndex((e) => e.key === current) : -1;
  const pendingAt = at >= 0 && entries[at]?.answer === 'pending' ? at : nextPending(entries, -1);
  const cur = pendingAt === null ? undefined : entries[pendingAt];
  const reading = session.reading || (link !== null && !held && inbox.isPending);

  // Each piece plays its scan once, as it comes up.
  // biome-ignore lint/correctness/useExhaustiveDependencies: restart only when the piece changes.
  useEffect(() => {
    if (!cur) return;
    if (reduced) {
      setStep(SCAN_STEPS);
      return;
    }
    setStep(0);
    const timer = window.setInterval(
      () =>
        setStep((s) => {
          if (s + 1 >= SCAN_STEPS) window.clearInterval(timer);
          return s + 1;
        }),
      SCAN_STEP_MS,
    );
    return () => window.clearInterval(timer);
  }, [cur?.key, reduced]);

  // A group files the moment its last piece is answered.
  useEffect(() => {
    for (const { group, answers: groupAnswers } of readyGroups(entries, filed)) {
      if (filing.current.has(group) || failed.has(group)) continue;
      filing.current.add(group);
      const done = () => setFiled((s) => new Set(s).add(group));
      fileGroup(group, groupAnswers)
        .then(done)
        .catch(() => setFailed((f) => new Set(f).add(group)))
        .finally(() => filing.current.delete(group));
    }
  });

  async function fileGroup(
    group: string,
    groupAnswers: Array<{ index: number; state: 'add' | 'skip'; edits?: RowChanges }>,
  ) {
    const labelOf = (i: number) =>
      entries.find((e) => e.group === group && e.index === i)?.base.label ?? '';
    if (group.startsWith('inbox:')) {
      const id = group.slice('inbox:'.length);
      const kept = groupAnswers.filter((a) => a.state === 'add');
      const decision = await api.call('inbox.decide', {
        params: { id },
        input: kept.length
          ? { action: to, itemIndexes: kept.map((a) => a.index) }
          : { action: 'dismiss' },
      });
      // Her changes land on what the decision filed (a link holds one piece).
      await Promise.all(
        kept.map((a, i) => {
          const pieceId = decision.filedIds[i];
          if (!pieceId || !a.edits) return null;
          return to === 'wishlist'
            ? api.call('wishlist.update', { params: { id: pieceId }, input: wishChanges(a.edits) })
            : api.call('wardrobe.update', { params: { id: pieceId }, input: a.edits });
        }),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('inbox.list') });
    } else {
      await api.call('photoReads.file', {
        params: { id: group },
        input: {
          to,
          answers: groupAnswers.map((a) =>
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
    if (to === 'wishlist') {
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('wishlist.list') });
    } else {
      await invalidateWardrobe(queryClient);
    }
  }

  function answer(entry: Entry, state: 'add' | 'skip') {
    const edits = changes[entry.key];
    setAnswers((a) => ({ ...a, [entry.key]: { answer: state, ...(edits ? { edits } : {}) } }));
    const next = nextPending(
      entries.map((e) => (e.key === entry.key ? { ...e, answer: state } : e)),
      entries.indexOf(entry),
    );
    setCurrent(next === null ? null : (entries[next]?.key ?? null));
  }

  const tally = reviewTally(entries);
  const allFiled = readyGroups(entries, filed).length === 0 && tally.pending === 0;
  const anyFound = entries.length > 0;

  // Filed: every piece answered and filed, nothing still reading.
  if (!reading && !cur && anyFound && allFiled && filing.current.size === 0) {
    return <Filed to={to} kept={tally.kept} onAnother={onAnother} />;
  }

  // Nothing in any photo (or a link that never arrived).
  if (!reading && !anyFound) {
    const stalled = session.shots.some((s) => s.failed);
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <Eyebrow>{copy.review.eyebrow}</Eyebrow>
        <ErrorText>{stalled ? copy.review.stalled : copy.review.nothing}</ErrorText>
        <Another to={to} onAnother={onAnother} className="self-start" />
      </div>
    );
  }

  // The next piece isn't read yet: the latest photo, scanning, under "Robes is reading…".
  if (!cur) {
    const latest = session.shots.at(-1);
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-5" aria-busy="true">
        <Eyebrow>{copy.review.eyebrow}</Eyebrow>
        <Heading level={1} size="lg" role="status">
          {copy.review.readingPhoto}
        </Heading>
        <ScanPhoto
          source={latest ? { ...latest, box: { x: 0, y: 0, w: 1, h: 1 } } : null}
          monogram={copy.review.eyebrow}
          step={2}
          tags={[]}
          caption=""
          alt={copy.review.readingPhoto}
        />
        <Skeleton className="h-32 w-full" />
        {failed.size ? <Retry onRetry={() => setFailed(new Set())} /> : null}
      </div>
    );
  }

  const values: PieceValues = { ...cur.base, ...changes[cur.key] } as PieceValues;
  const ready = step >= SCAN_READY_STEP;
  const isRead = cur.found.kind === 'read';
  const source: ScanSource | null =
    cur.found.kind === 'read' ? { ...cur.found.photo, box: cur.found.piece.box } : null;
  const category = cur.found.kind === 'read' ? sheetOf(cur.found.piece) : null;
  const tags = scanTags([
    category,
    cur.found.kind === 'read' ? pieceWord(cur.found.piece) : null,
    values.brand,
    shade(values.colourShade)?.name,
    values.label,
  ]);
  const position = entries.indexOf(cur);
  const hasNext = nextPending(entries, position) !== null || session.reading;
  const save = (input: UpdatePieceInput) =>
    setChanges((c) => ({ ...c, [cur.key]: { ...c[cur.key], ...rowChanges(input) } }));

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      {entries.length > 1 ? (
        <nav aria-label={copy.review.pieces} className="-mx-1 flex gap-2 overflow-x-auto px-1">
          {entries.map((e, i) => (
            <button
              key={e.key}
              type="button"
              aria-label={copy.review.piece(i + 1, entries.length)}
              aria-current={e.key === cur.key ? 'true' : undefined}
              disabled={e.answer !== 'pending'}
              onClick={() => setCurrent(e.key)}
              className={`shrink-0 rounded-crisp border p-[2px] focus-visible:outline-2 focus-visible:outline-focus-ring ${e.key === cur.key ? 'border-selected-line' : 'border-transparent'} ${e.answer === 'pending' ? '' : 'opacity-40'}`}
            >
              {e.found.kind === 'read' ? (
                <CropThumb
                  src={e.found.photo.url}
                  box={e.found.piece.box}
                  natural={e.found.photo}
                  className="size-[52px]"
                />
              ) : (
                <span className="block size-[52px] rounded-soft bg-surface-sunk" />
              )}
            </button>
          ))}
        </nav>
      ) : null}
      <header className="flex flex-col gap-2">
        <Eyebrow>{copy.review.eyebrow}</Eyebrow>
        <Heading level={1} size="lg">
          {copy.review.title} <em>{copy.review.wink}</em>
        </Heading>
        <Text size="small" tone="muted">
          {isRead ? copy.review.sub.photo : copy.review.sub.link}
        </Text>
      </header>
      <div className="relative">
        <ScanPhoto
          source={source}
          monogram={values.label}
          step={step}
          tags={tags}
          caption={ready ? values.label : ''}
          alt={wardrobe.photoAlt(values.label)}
        />
        {isRead && session.shots.length === 1 && onRetake ? (
          <button
            type="button"
            onClick={onRetake}
            className="absolute top-3 right-3 inline-flex min-h-11 items-center rounded-pill bg-bg px-4 font-sans text-ink text-sm focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            {copy.review.retake}
          </button>
        ) : null}
      </div>
      <RecordRows values={values} onField={setField} withName reading={!ready} />
      <Button variant="quiet" className="self-center" onClick={() => answer(cur, 'skip')}>
        {copy.review.notThis}
      </Button>
      {failed.size ? <Retry onRetry={() => setFailed(new Set())} /> : null}
      <Button variant="primary" disabled={!ready} onClick={() => answer(cur, 'add')}>
        {copy.review.file(to, hasNext)}
      </Button>
      <PieceFieldSheet
        piece={values}
        field={field}
        onClose={() => setField(null)}
        onSave={save}
        saving={false}
      />
    </div>
  );
}

function Retry({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <ErrorText>{copy.review.failed}</ErrorText>
      <Button variant="quiet" className="self-start" onClick={onRetry}>
        {ui.retry}
      </Button>
    </div>
  );
}

// Filed (design 3a): how many, in words, one line on where they are, and the way on.
export function Filed({
  to,
  kept,
  onAnother,
}: {
  to: AddDestination;
  kept: number;
  onAnother?: (() => void) | undefined;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-10">
      <div className="flex flex-col gap-3">
        <Heading level={1} size="lg" role="status">
          {kept ? (
            <>
              {copy.filed.head(kept)} <em>{copy.filed.wink}</em>
            </>
          ) : (
            copy.filed.none
          )}
        </Heading>
        {kept ? (
          <Text tone="muted">
            {to === 'wishlist' ? copy.filed.line.wishlist(kept) : copy.filed.line.wardrobe}
          </Text>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        <Link
          href={wardrobeHref(to)}
          className={buttonClasses({ variant: 'primary', block: true })}
        >
          {copy.filed.see[to]}
        </Link>
        <Another to={to} onAnother={onAnother} />
      </div>
    </div>
  );
}

function Another({
  to,
  onAnother,
  className = '',
}: {
  to: AddDestination;
  onAnother?: (() => void) | undefined;
  className?: string;
}) {
  return onAnother ? (
    <Button variant="secondary" className={className} onClick={onAnother}>
      {copy.filed.another}
    </Button>
  ) : (
    <Link
      href={`/wardrobe/add?to=${to}`}
      className={`${buttonClasses({ variant: 'secondary', block: !className })} ${className}`}
    >
      {copy.filed.another}
    </Link>
  );
}
