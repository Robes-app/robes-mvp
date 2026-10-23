'use client';

import { useApi, useApiClient } from '@robes/api-client/react';
import type { LookSet } from '@robes/contracts';
import { lookbook as copy, jobs, wardrobe } from '@robes/copy';
import { isTerminalJobStatus } from '@robes/core/jobs';
import { anchorName, deckReduce, deckTop, emptyDeck } from '@robes/core/looks';
import {
  Button,
  buttonClasses,
  ErrorText,
  Eyebrow,
  Heading,
  IconButton,
  Image,
  Skeleton,
  Text,
  useToast,
} from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type PointerEvent, useEffect, useReducer, useRef, useState } from 'react';
import { formatDay } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { imageSources } from '@/lib/image';
import { useLookSet, useRefreshLooks, useRequestFrame } from '@/lib/look-states';
import { useJob } from '@/lib/use-job';
import { LookImage } from './look-image';
import { ScanLine } from './scan-line';

const COMMIT_PX = 100;
const JOB_POLL_MS = 1500;
type SetLook = LookSet['looks'][number];

function DeckTitle({ set }: { set: LookSet | undefined }) {
  const { data: model } = useApi('me.model.get');
  const around = set?.anchor ? anchorName(set.anchor.label, set.anchor.brand) : '';
  const eyebrow = around
    ? copy.deck.eyebrowAround(around)
    : set?.dateHint
      ? copy.deck.eyebrowFor(formatDay(set.dateHint))
      : copy.deck.eyebrowPrompt;
  return (
    <header className="flex flex-col items-center gap-2 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading level={1} size="xl">
        {around ? copy.deck.titleAround(around) : copy.deck.titlePrompt}{' '}
        <em>{copy.deck.titleTail}</em>
      </Heading>
      {model?.filed ? (
        <Text size="small" tone="muted">
          {copy.deck.modelYours}
        </Text>
      ) : null}
    </header>
  );
}

// While the looks compose: her piece (or her words) under the scanner, a line that changes every
// 2.2s; a Robes model wears them until hers exists.
function Dressing({ set }: { set?: LookSet }) {
  const [i, setI] = useState(0);
  const { data: model } = useApi('me.model.get');
  const around = set?.anchor ? anchorName(set.anchor.label, set.anchor.brand) : '';
  const lines = model?.filed ? copy.deck.scan : [...copy.deck.scan, copy.deck.scanGeneric];
  useEffect(() => {
    const t = setInterval(() => setI((n) => n + 1), 2200);
    return () => clearInterval(t);
  }, []);
  const photo = set?.anchor?.image ? imageSources(set.anchor.image.renditions) : null;
  return (
    <div
      className="mx-auto flex w-full max-w-sm flex-col gap-3"
      aria-live="polite"
      data-testid="deck-dressing"
    >
      <div className="relative overflow-hidden rounded-soft">
        {photo ? (
          <Image src={photo.src} srcSet={photo.srcSet} sizes="384px" alt="" aspect="4:5" />
        ) : (
          <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 bg-surface-sunk p-8 text-center">
            <span className="font-display text-5xl text-ink-muted" aria-hidden>
              “
            </span>
            {set?.prompt ? <Text tone="muted">{set.prompt.slice(0, 90)}</Text> : null}
          </div>
        )}
        <ScanLine />
      </div>
      <Text className="font-display text-xl">
        {around ? copy.deck.yourPiece(around) : copy.deck.composing}
      </Text>
      <Text size="small" tone="muted">
        {lines[i % lines.length]}
      </Text>
      <Text size="caption" tone="muted" className="text-center">
        {copy.deck.teach}
      </Text>
    </div>
  );
}

function Card({
  look,
  onOpen,
  onDecide,
}: {
  look: SetLook;
  onOpen: () => void;
  onDecide: (dir: 1 | -1) => void;
}) {
  const [dx, setDx] = useState(0);
  const [flying, setFlying] = useState<1 | -1 | null>(null);
  const start = useRef<number | null>(null);
  const moved = useRef(false);
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    start.current = e.clientX;
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (start.current === null) return;
    const d = e.clientX - start.current;
    if (Math.abs(d) > 6) moved.current = true;
    if (moved.current) setDx(d);
  };
  const onPointerUp = () => {
    if (start.current === null) return;
    start.current = null;
    if (Math.abs(dx) >= COMMIT_PX) {
      const dir = dx > 0 ? 1 : -1;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) onDecide(dir);
      else setFlying(dir);
      return;
    }
    setDx(0);
    if (!moved.current) onOpen();
  };
  const x = flying ? flying * 900 : dx;
  return (
    <article
      aria-label={look.name}
      data-testid={`deck-card-${look.id}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDragStart={(e) => e.preventDefault()}
      onTransitionEnd={() => {
        if (flying) onDecide(flying);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onDecide(1);
        else if (e.key === 'ArrowLeft') onDecide(-1);
        else if (e.key === 'Enter') onOpen();
      }}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the card takes ← → and Enter
      tabIndex={0}
      className={`relative mx-auto w-full max-w-sm cursor-grab touch-pan-y select-none rounded-soft border border-hairline bg-surface p-2 ${start.current === null ? 'transition-transform duration-300' : ''}`}
      style={{ transform: x ? `translateX(${x}px) rotate(${x * 0.04}deg)` : undefined }}
    >
      <div className="pointer-events-none">
        <LookImage look={look} sizes="384px" />
      </div>
      <Text className="mt-2 font-display text-xl">{look.name}</Text>
      <Text size="small" tone="muted">
        {copy.deck.pieces(look.pieces.length + look.proposals.length)}
      </Text>
      <span
        aria-hidden
        className="absolute top-4 left-4 rounded-crisp border border-border-control bg-bg px-2 py-1 text-xs"
        style={{ opacity: Math.max(0, Math.min(1, x / COMMIT_PX)) }}
      >
        ✓ {copy.deck.keep}
      </span>
      <span
        aria-hidden
        className="absolute top-4 right-4 rounded-crisp border border-hairline bg-bg px-2 py-1 text-xs text-ink-muted"
        style={{ opacity: Math.max(0, Math.min(1, -x / COMMIT_PX)) }}
      >
        ✕ {copy.deck.pass}
      </span>
    </article>
  );
}

// Keep or pass (legacy F14): one card at a time; a pass waits behind "Passed · Undo"; a keep
// leaves the look waiting in Suggested until she saves it.
// `home`: opened from home (the box, or onboarding's first piece), so back lands home.
export function Deck({ setId, home = false }: { setId: string; home?: boolean }) {
  const router = useRouter();
  const api = useApiClient();
  const toast = useToast();
  const refresh = useRefreshLooks();
  const requestFrame = useRequestFrame();
  const [deck, dispatch] = useReducer(deckReduce, undefined, emptyDeck);
  // The job that writes the set: until it ends, an empty set is still being composed.
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useApi(
    'jobs.get',
    { params: { id: jobId ?? '' } },
    {
      enabled: jobId !== null,
      refetchInterval: (q) =>
        q.state.data && isTerminalJobStatus(q.state.data.status) ? false : JOB_POLL_MS,
    },
  );
  const jobDone = job.data ? isTerminalJobStatus(job.data.status) : false;
  const {
    data: set,
    isError,
    error,
  } = useLookSet(setId, {
    waiting: !jobDone && deck.order.length === 0,
  });
  useEffect(() => {
    if (set?.jobId) setJobId(set.jobId);
  }, [set?.jobId]);
  const looks = set?.looks ?? [];
  const ids = looks.map((l) => l.id).join(',');
  useEffect(() => {
    if (ids) dispatch({ type: 'land', ids: ids.split(',') });
  }, [ids]);
  const topId = deckTop(deck);
  const top = looks.find((l) => l.id === topId);
  const asked = useRef(new Set<string>());
  useEffect(() => {
    for (const id of deck.order.slice(deck.at, deck.at + 2)) {
      const l = looks.find((x) => x.id === id);
      if (l && !l.image && !l.framePending && !asked.current.has(id)) {
        asked.current.add(id);
        requestFrame(id);
      }
    }
  }, [deck, looks, requestFrame]);

  const decide = (id: string, dir: 1 | -1) => {
    if (dir > 0) {
      dispatch({ type: 'keep', id });
      return;
    }
    dispatch({ type: 'pass', id });
    void api
      .call('looks.delete', { params: { id } })
      .then(() =>
        toast({
          message: copy.passed,
          action: {
            label: wardrobe.undo,
            onAction: () =>
              void api
                .call('looks.restore', { params: { id } })
                .then(() => {
                  dispatch({ type: 'undo', id });
                  refresh();
                })
                .catch((err) => toast({ message: errorCopy(err) })),
          },
        }),
      )
      .catch((err) => toast({ message: errorCopy(err) }));
  };

  if (isError) {
    return <ErrorText>{errorCopy(error)}</ErrorText>;
  }
  const around = set?.anchor ? anchorName(set.anchor.label, set.anchor.brand) : '';
  // Done once she has decided every card (all passed included), or the job ended with none.
  const done =
    !top && (deck.order.length > 0 || (set !== undefined && jobDone && looks.length === 0));
  const composing = !set || (looks.length === 0 && !done);
  const kept = deck.kept.map((id) => looks.find((l) => l.id === id)).filter((l) => l !== undefined);
  return (
    <div className="flex flex-col gap-8" data-testid="deck">
      <DeckTitle set={set} />
      {composing ? (
        <Dressing {...(set ? { set } : {})} />
      ) : done ? (
        <section className="flex flex-col items-center gap-5 text-center" data-testid="deck-done">
          <Heading level={2} size="lg">
            {copy.deck.kept(kept.length)}
          </Heading>
          {kept.length ? (
            <ul className="flex gap-2">
              {kept.map((l) => (
                <li key={l.id} className="w-20">
                  <Link href={`/look/${l.id}`} aria-label={l.name}>
                    <LookImage look={l} sizes="80px" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Text tone="muted">
              {around ? copy.deck.noneAgainPiece : copy.deck.noneAgainPrompt}
            </Text>
          )}
          <div className="flex flex-col items-center gap-2">
            {kept.length ? (
              <Link href="/looks?tab=suggested" className={buttonClasses({ variant: 'primary' })}>
                {copy.deck.see}
              </Link>
            ) : null}
            {home ? (
              <Link href="/" className={buttonClasses({ variant: 'quiet' })}>
                {copy.deck.backHome}
              </Link>
            ) : (
              <Button variant="quiet" onClick={() => router.back()}>
                {around ? copy.deck.backTo(around) : copy.deck.backHome}
              </Button>
            )}
          </div>
        </section>
      ) : top ? (
        <div className="flex flex-col gap-4">
          <Card
            key={top.id}
            look={top}
            onOpen={() => router.push(`/look/${top.id}`)}
            onDecide={(dir) => decide(top.id, dir)}
          />
          <div className="flex items-center justify-center gap-8">
            <IconButton
              icon="close"
              outlined
              label={copy.deck.pass}
              onClick={() => decide(top.id, -1)}
            />
            <Button variant="primary" onClick={() => decide(top.id, 1)} aria-label={copy.deck.keep}>
              ✓ {copy.deck.keep}
            </Button>
          </div>
          <div className="flex justify-center gap-1" aria-hidden>
            {deck.order.map((id, i) => (
              <span
                key={id}
                className={`size-1.5 rounded-pill ${i === deck.at ? 'bg-ink' : 'bg-surface-sunk'}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// After a styling job: the deck, dressing until the looks land.
export function JobDeck({ jobId, home = false }: { jobId: string; home?: boolean }) {
  const { job, connection } = useJob(jobId);
  const setId = job?.output.setId;
  // Looks minted before the job failed (a frame that ran out of time) still make the deck.
  if (setId) return <Deck setId={setId} />;
  if (job?.status === 'failed' || job?.status === 'cancelled' || connection === 'unavailable') {
    return (
      <ErrorText>
        {copy.deck.failed} {jobs.status.failed}
      </ErrorText>
    );
  }
  if (!setId) {
    return (
      <div className="flex flex-col gap-8">
        <DeckTitle set={undefined} />
        <Dressing />
      </div>
    );
  }
  return <Deck setId={setId} home={home} />;
}

export function DeckSkeleton() {
  return <Skeleton className="mx-auto aspect-[4/5] w-full max-w-sm" />;
}
