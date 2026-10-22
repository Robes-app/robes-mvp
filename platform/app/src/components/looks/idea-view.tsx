'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Idea, IdeaWay } from '@robes/contracts';
import { keyPiece as kp, looks } from '@robes/copy';
import { Button, ErrorText, Eyebrow, Heading, Sheet, Skeleton, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { errorCopy } from '@/lib/error-copy';
import { useFrameRender } from '@/lib/frame-render';
import { framesLanding, ideaNeedsRefresh } from '@/lib/looks';
import { IdeaFrame } from './idea-frame';

const copy = looks.result;
const REFRESH_MS = 1500;

export function IdeaView({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const refreshIdea = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.call('looks.ideas.get', { params: { id: ideaId } }),
    });
  const frames = useFrameRender('looks.ideas.render', ideaId, () => void refreshIdea());
  const query = useApi(
    'looks.ideas.get',
    { params: { id: ideaId } },
    {
      refetchInterval: (q) =>
        ideaNeedsRefresh(q.state.data) || framesLanding(q.state.data, frames.asked)
          ? REFRESH_MS
          : false,
    },
  );
  const refreshLists = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.ideas.list') });
  const save = useApiMutation('looks.ideas.save', {
    onSuccess: (idea) => {
      queryClient.setQueryData(queryKeys.call('looks.ideas.get', { params: { id: ideaId } }), idea);
      void refreshLists();
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const saveWay = useApiMutation('looks.ideas.saveWay', {
    onSuccess: (look) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
      void refreshLists();
      toast({
        message: looks.savedWay,
        action: { label: looks.openLook, onAction: () => router.push(`/look/${look.id}`) },
      });
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const remove = useApiMutation('looks.ideas.delete', {
    onSuccess: () => {
      void refreshLists();
      toast({ message: copy.removed });
      router.push('/looks/ideas');
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });

  if (query.isError) {
    return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  }
  const idea = query.data;
  if (!idea) return <IdeaSkeleton />;
  return (
    <IdeaBody
      idea={idea}
      onSave={() => save.mutate({ params: { id: idea.id } })}
      onRemove={() => remove.mutate({ params: { id: idea.id } })}
      onSaveWay={(wayIdx) => saveWay.mutate({ params: { id: idea.id }, input: { wayIdx } })}
      savingWay={saveWay.isPending ? (saveWay.variables?.input.wayIdx ?? null) : null}
      onShowFrame={frames.start}
      showingFrame={frames.renderingIdx}
      saving={save.isPending}
      removing={remove.isPending}
    />
  );
}

function IdeaBody({
  idea,
  onSave,
  onRemove,
  onSaveWay,
  savingWay,
  onShowFrame,
  showingFrame,
  saving,
  removing,
}: {
  idea: Idea;
  onSave: () => void;
  onRemove: () => void;
  onSaveWay: (wayIdx: number) => void;
  savingWay: number | null;
  onShowFrame: (idx: number) => void;
  showingFrame: number | null;
  saving: boolean;
  removing: boolean;
}) {
  const saved = idea.savedAt !== null;
  const [open, setOpen] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);
  const anchor = useApi(
    'wardrobe.get',
    { params: { id: idea.anchor.type === 'piece' ? idea.anchor.pieceId : '' } },
    { enabled: idea.anchor.type === 'piece' },
  );
  const pager = useRef<HTMLOListElement>(null);
  const way = open === null ? null : (idea.ways[open] ?? null);

  // The phone's pager: the card nearest the centre is the current one (legacy _kpCurFromScroll).
  function onScroll() {
    const el = pager.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let gap = Number.POSITIVE_INFINITY;
    Array.from(el.children).forEach((child, i) => {
      const c = child as HTMLElement;
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
      if (d < gap) {
        gap = d;
        best = i;
      }
    });
    setCurrent(best);
  }
  const go = (i: number) => {
    const el = pager.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          {anchor.data?.image ? (
            <div className="w-[46px] shrink-0 overflow-hidden rounded-[6px] border border-hairline">
              <PieceImage piece={anchor.data} sizes="46px" />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Eyebrow>{idea.anchor.type === 'piece' ? kp.eyebrowYours : kp.eyebrow}</Eyebrow>
            <Heading level={1} size="xl">
              {idea.title}
            </Heading>
            {idea.fallback ? <Text tone="muted">{copy.fallback}</Text> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="quiet" onClick={onRemove} loading={removing}>
            {copy.remove}
          </Button>
          <Button variant="secondary" disabled={saved} loading={saving} onClick={onSave}>
            {saved ? copy.saved : copy.save}
          </Button>
        </div>
      </header>
      <ol
        ref={pager}
        onScroll={onScroll}
        aria-label={copy.eyebrow}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[max(1rem,calc(50vw-171px))] pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0"
      >
        {idea.ways.map((w, idx) => (
          <li
            key={w.title}
            aria-label={kp.way(idx + 1, idea.ways.length)}
            className={`flex w-[min(342px,calc(100vw-60px))] shrink-0 snap-center flex-col gap-3 motion-safe:transition-opacity md:w-auto ${
              idx === current ? '' : 'opacity-55 md:opacity-100'
            }`}
          >
            <WayCard
              idea={idea}
              idx={idx}
              onOpen={() => {
                // A neighbour's tap brings it to the centre too.
                if (idx !== current) go(idx);
                setOpen(idx);
              }}
              showing={showingFrame === idx}
              onShowFrame={() => onShowFrame(idx)}
            />
            <div className="hidden md:flex">
              <SaveWay idx={idx} title={w.title} saving={savingWay === idx} onSaveWay={onSaveWay} />
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-col items-center gap-4 md:hidden">
        <div className="flex items-center gap-1.5" aria-hidden>
          {idea.ways.map((w, i) => (
            <span
              key={w.title}
              className={`h-[5px] rounded-pill ${i === current ? 'w-[18px] bg-ink' : 'w-[5px] bg-border-control'}`}
            />
          ))}
        </div>
        {idea.ways[current] ? (
          <SaveWay
            idx={current}
            title={idea.ways[current].title}
            saving={savingWay === current}
            onSaveWay={onSaveWay}
          />
        ) : null}
      </div>
      <Sheet
        title={way?.title ?? ''}
        description={way ? `${way.eyebrow} · ${kp.sheetLine}` : undefined}
        open={way !== null}
        onOpenChange={(o) => (o ? undefined : setOpen(null))}
        footer={
          way && open !== null ? (
            <Button
              variant="primary"
              loading={savingWay === open}
              onClick={() => {
                onSaveWay(open);
                setOpen(null);
              }}
            >
              {looks.saveWay}
            </Button>
          ) : undefined
        }
      >
        {way ? <PieceByPiece way={way} /> : null}
      </Sheet>
    </article>
  );
}

function SaveWay({
  idx,
  title,
  saving,
  onSaveWay,
}: {
  idx: number;
  title: string;
  saving: boolean;
  onSaveWay: (idx: number) => void;
}) {
  return (
    <Button
      variant="secondary"
      loading={saving}
      onClick={() => onSaveWay(idx)}
      aria-label={`${looks.saveWay}: ${title}`}
    >
      {looks.saveWay}
    </Button>
  );
}

// A 4:5 card with the frosted swatch pill; the eyebrow and serif title beneath (legacy .kp-look-card).
function WayCard({
  idea,
  idx,
  onOpen,
  showing,
  onShowFrame,
}: {
  idea: Idea;
  idx: number;
  onOpen: () => void;
  showing: boolean;
  onShowFrame: () => void;
}) {
  const way = idea.ways[idx];
  if (!way) return null;
  const yours = way.pieces.filter((p) => p.pieceId).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <IdeaFrame
          frame={idea.frames.find((f) => f.idx === idx)}
          alt={copy.frameAlt(way.title)}
          priority={idx === 0}
          sizes="(min-width: 768px) 33vw, 342px"
          show={{
            label: copy.showLook,
            ariaLabel: copy.showLookLabel(way.title),
            busy: showing,
            onShow: onShowFrame,
          }}
        />
        {way.pieces.length ? (
          <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-pill bg-bg/85 px-3 py-1.5 backdrop-blur">
            <span className="flex -space-x-1" aria-hidden>
              {way.pieces.map((p) => (
                <Swatch key={`${p.name}-${p.role}`} hex={p.colorHex} />
              ))}
            </span>
            <span className="font-sans text-[11px] text-ink">
              {kp.pill(way.pieces.length, yours)}
            </span>
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <Eyebrow>{way.eyebrow}</Eyebrow>
        <h2 className="font-display text-2xl leading-tight font-normal text-ink">
          <button
            type="button"
            onClick={onOpen}
            aria-label={kp.open(way.title)}
            className="text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            {way.title}
          </button>
        </h2>
      </div>
    </div>
  );
}

// A piece's colour as the model gave it (runtime data, never a literal in the source).
function Swatch({ hex }: { hex: string | null }) {
  const valid = hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : null;
  return (
    <span
      className="block size-3.5 rounded-pill border border-bg bg-surface-sunk"
      style={valid ? { backgroundColor: valid } : undefined}
    />
  );
}

// The piece-by-piece sheet: one row per piece, her own marked; a way from before v2 shows its prose.
function PieceByPiece({ way }: { way: IdeaWay }) {
  if (way.pieces.length === 0) {
    return (
      <dl className="flex flex-col gap-2">
        <Detail term={copy.outfit} value={way.outfit} />
        <Detail term={copy.details} value={way.details} />
        <Detail term={copy.accessories} value={way.accessories} />
      </dl>
    );
  }
  return (
    <ul className="flex flex-col">
      {way.pieces.map((p) => (
        <li
          key={`${p.name}-${p.role}`}
          className="flex items-center gap-3 border-b border-hairline py-3"
        >
          <span className="flex size-10 items-center justify-center rounded-[6px] bg-surface">
            <Swatch hex={p.colorHex} />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-sans text-[9px] tracking-[0.18em] text-ink-faint uppercase">
              {p.category}
              {' · '}
              {p.pieceId ? (
                <span className="text-accent-warm">{kp.inWardrobe}</span>
              ) : (
                [p.brand, p.pricePoint].filter(Boolean).join(' ')
              )}
            </span>
            <span className="font-display text-lg leading-tight text-ink">{p.name}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Detail({ term, value }: { term: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="font-sans text-xs font-medium text-ink-muted">{term}</dt>
      <dd className="font-sans text-sm font-light text-ink">{value}</dd>
    </div>
  );
}

export function IdeaSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-8">
      <Skeleton shape="text" className="h-10 w-2/3" />
      <div className="grid gap-8 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-4">
            <Skeleton className="aspect-[4/5]" />
            <Skeleton shape="text" className="w-1/2" />
            <Skeleton shape="text" />
          </div>
        ))}
      </div>
    </div>
  );
}
