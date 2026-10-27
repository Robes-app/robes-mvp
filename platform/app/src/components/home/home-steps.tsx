'use client';

import type { Home, HomePiece } from '@robes/contracts';
import { home as copy } from '@robes/copy';
import { type HomeResolved, type HomeStep, mapRows } from '@robes/core/home';
import { anchorName, nameNoBrand } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { Button, buttonClasses, Eyebrow, Heading, Image, Text } from '@robes/ui';
import Link from 'next/link';
import { useState } from 'react';
import { SwapSheet } from '@/components/looks/swap-sheet';
import { imageSources } from '@/lib/image';

// A step card sits on white with a hairline (Design principle 3), never on the beige page.
const card = 'flex flex-col gap-3 rounded-soft border border-hairline bg-surface-raised p-5';

function Title({ title, em }: { title: string; em: string }) {
  return (
    <Heading level={2} size="lg">
      {title} <em>{em}</em>
    </Heading>
  );
}

function Thumb({ piece, className = '' }: { piece: HomePiece; className?: string }) {
  const src = piece.image ? imageSources(piece.image.renditions) : null;
  return src ? (
    <Image
      src={src.src}
      srcSet={src.srcSet}
      sizes="96px"
      alt=""
      aspect="4:5"
      blurhash={piece.image?.blurhash ?? null}
      className={className}
    />
  ) : (
    <div aria-hidden className={`aspect-[4/5] rounded-crisp bg-surface-sunk ${className}`} />
  );
}

function Later({ onLater, centred = false }: { onLater: () => void; centred?: boolean }) {
  return (
    <Button variant="quiet" onClick={onLater} className={centred ? 'self-center' : ''}>
      {copy.later}
    </Button>
  );
}

// O1 · Style DNA: one door while nothing is filed (f044b35), her chips once anything is.
function StyleCard({ rows, onLater }: { rows: Home['rows']; onLater: () => void }) {
  const any = rows.brands.length + rows.icons.length + rows.styles.length > 0;
  return (
    <div className={card} data-module="O1">
      <Eyebrow>{copy.o1.eyebrow}</Eyebrow>
      <Title title={copy.o1.title} em={copy.o1.titleEm} />
      {any ? (
        <>
          <Text size="small" tone="muted">
            {copy.o1.body}
          </Text>
          <ul className="flex flex-col divide-y divide-hairline border-hairline border-y">
            {(['brands', 'icons', 'styles'] as const).map((k) => (
              <li key={k}>
                <Link
                  href="/you/style"
                  className="flex items-center gap-4 py-3 focus-visible:outline-2 focus-visible:outline-focus-ring"
                >
                  <span className="w-16 font-sans text-ink-muted text-xs uppercase tracking-wider">
                    {copy.o1.rows[k]}
                  </span>
                  <span className="flex flex-1 flex-wrap gap-1.5">
                    {rows[k].length ? (
                      rows[k].map((c) => (
                        <span
                          key={c}
                          className="rounded-pill border border-hairline px-2.5 py-0.5 font-sans text-sm"
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="font-sans text-ink-muted text-sm">{copy.o1.add}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <Link href="/you/style" className={buttonClasses({ variant: 'secondary' })}>
              {copy.o1.finish}
            </Link>
            <Later onLater={onLater} />
          </div>
        </>
      ) : (
        <>
          <Text size="small" tone="muted">
            {copy.o1.bodyEmpty}
          </Text>
          <Link href="/you/style" className={`${buttonClasses({ variant: 'primary' })} w-full`}>
            {copy.o1.one}
          </Link>
          <Later onLater={onLater} centred />
        </>
      )}
    </div>
  );
}

// O2 · the twin: two dashed slots, every tap opens the twin page.
function TwinCard({ onLater }: { onLater: () => void }) {
  return (
    <div className={card} data-module="O2">
      <div className="grid grid-cols-2 gap-3">
        {[copy.o2.closeUp, copy.o2.full].map((label) => (
          <Link
            key={label}
            href="/you/model"
            className="flex aspect-[4/5] max-w-[150px] items-end justify-center rounded-crisp border-[1.5px] border-border-control border-dashed p-3 font-display text-ink-muted text-base italic focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            {label}
          </Link>
        ))}
      </div>
      <Eyebrow>{copy.o2.eyebrow}</Eyebrow>
      <Title title={copy.o2.title} em={copy.o2.titleEm} />
      <Text size="small" tone="muted">
        {copy.o2.body}
      </Text>
      <div className="flex items-center gap-3">
        <Link href="/you/model" className={buttonClasses({ variant: 'secondary' })}>
          {copy.o2.cta}
        </Link>
        <Later onLater={onLater} />
      </div>
    </div>
  );
}

// O3 · the wardrobe: the count once, in words; the two bulk routes.
function WardrobeCard({ pics, recent }: { pics: number; recent: HomePiece[] }) {
  const route = (href: string, icon: 'camera' | 'mail', title: string, line: string) => (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-4 py-3 focus-visible:outline-2 focus-visible:outline-focus-ring"
    >
      <Icon name={icon} size={20} className="text-ink-muted" />
      <span className="flex flex-1 flex-col">
        <span className="font-display text-ink text-lg">{title}</span>
        <span className="font-sans text-ink-muted text-sm">{line}</span>
      </span>
      <Icon name="forward" size={16} className="text-ink-muted" />
    </Link>
  );
  return (
    <div className={card} data-module="O3">
      <Eyebrow>{copy.o3.eyebrow}</Eyebrow>
      <Heading level={2} size="lg">
        {pics === 0 ? (
          copy.o3.empty
        ) : (
          <>
            {copy.o3.filed(pics)} <em>{copy.o3.rest}</em>
          </>
        )}
      </Heading>
      <ul className="grid grid-cols-5 gap-2">
        {recent.map((p) => (
          <li key={p.id}>
            <Thumb piece={p} />
          </li>
        ))}
        <li>
          <Link
            href="/wardrobe/add"
            aria-label={copy.o3.snap.title}
            className="flex aspect-[4/5] items-center justify-center rounded-crisp border-[1.5px] border-border-control border-dashed text-ink-muted focus-visible:outline-2 focus-visible:outline-focus-ring"
          >
            <Icon name="plus" size={18} />
          </Link>
        </li>
      </ul>
      <div className="flex flex-col divide-y divide-hairline border-hairline border-y">
        {route('/wardrobe/add', 'camera', copy.o3.snap.title, copy.o3.snap.line)}
        {route('/wardrobe/receipt', 'mail', copy.o3.receipt.title, copy.o3.receipt.line)}
      </div>
    </div>
  );
}

// O4 · the first look: three candidates, the first pre-selected; the pick anchors the look.
function FirstLookCard({ candidates }: { candidates: HomePiece[] }) {
  const [picked, setPicked] = useState<HomePiece | null>(null);
  const [all, setAll] = useState(false);
  const pick = picked ?? candidates[0] ?? null;
  const shown =
    pick && !candidates.some((c) => c.id === pick.id)
      ? [pick, ...candidates.slice(0, 2)]
      : candidates;
  return (
    <div className={card} data-module="O4">
      <Eyebrow>{copy.o4.eyebrow}</Eyebrow>
      <Title title={copy.o4.title} em={copy.o4.titleEm} />
      <Text size="small" tone="muted">
        {copy.o4.body}
      </Text>
      <ul className="grid grid-cols-3 gap-3">
        {shown.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              aria-pressed={pick?.id === p.id}
              aria-label={copy.o4.pick(anchorName(p.label, p.brand))}
              onClick={() => setPicked(p)}
              className={`relative flex w-full flex-col gap-1 rounded-crisp border bg-surface-raised p-1 text-left focus-visible:outline-2 focus-visible:outline-focus-ring ${pick?.id === p.id ? 'border-selected-line' : 'border-hairline'}`}
            >
              <Thumb piece={p} />
              {pick?.id === p.id ? (
                <span
                  aria-hidden
                  className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-pill border border-selected-line bg-surface-raised text-ink"
                >
                  <Icon name="check" size={14} />
                </span>
              ) : null}
              <span className="line-clamp-2 px-1 pb-1 font-display text-ink text-base">
                {nameNoBrand(p.label, p.brand)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        {pick ? (
          <Link
            href={`/looks/new?pieceId=${pick.id}`}
            className={buttonClasses({ variant: 'secondary' })}
          >
            {copy.o4.cta}
          </Link>
        ) : null}
        <Button variant="quiet" onClick={() => setAll(true)}>
          {copy.o4.all}
        </Button>
      </div>
      <SwapSheet
        open={all}
        swapping={null}
        onRack={[]}
        onClose={() => setAll(false)}
        onPick={(p) => setPicked({ id: p.id, label: p.label, brand: p.brand, image: p.image })}
      />
    </div>
  );
}

export function StepCard({
  step,
  home,
  onLater,
}: {
  step: HomeStep;
  home: Home;
  onLater: (step: HomeStep) => void;
}) {
  if (step === 'O1') return <StyleCard rows={home.rows} onLater={() => onLater('O1')} />;
  if (step === 'O2') return <TwinCard onLater={() => onLater('O2')} />;
  if (step === 'O3') return <WardrobeCard pics={home.state.pics} recent={home.recent} />;
  return <FirstLookCard candidates={home.candidates} />;
}

const DONE_HREF: Record<HomeStep, string> = {
  O1: '/you/style',
  O2: '/you/model',
  O3: '/wardrobe',
  O4: '/looks',
};

// G1 · the quiet map: an open row expands its module, a done row opens its page; once activated,
// one headerless row at the foot.
export function StepMap({
  resolved,
  pics,
  onExpand,
}: {
  resolved: HomeResolved;
  pics: number;
  onExpand: (step: HomeStep) => void;
}) {
  const keys = mapRows(resolved);
  if (!keys.length) return null;
  const line = (k: HomeStep, done: boolean) =>
    k === 'O3' ? copy.map.line.O3(pics) : copy.map.line[k](done);
  const row = (k: HomeStep) => {
    const done = resolved.done[k];
    const inner = (
      <>
        <span
          aria-hidden
          className={`flex size-6 items-center justify-center rounded-pill ${done ? 'border border-selected-line bg-selected text-ink' : 'border border-border-control border-dashed'}`}
        >
          {done ? <Icon name="check" size={14} /> : null}
        </span>
        <span className="flex flex-1 flex-col">
          <span className={`font-display text-xl ${done ? 'text-ink-faint' : 'text-ink'}`}>
            {copy.map.steps[k]}
          </span>
          <span className="font-sans text-ink-muted text-sm">{line(k, done)}</span>
        </span>
        <Icon name="forward" size={16} className="text-ink-muted" />
      </>
    );
    const cls =
      'flex w-full items-center gap-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-focus-ring';
    return (
      <li key={k} data-step={k} data-state={done ? 'done' : 'later'}>
        {done || resolved.activated ? (
          <Link
            href={done ? DONE_HREF[k] : k === 'O1' ? '/you/style' : '/you/model'}
            className={cls}
          >
            {inner}
          </Link>
        ) : (
          <button type="button" className={cls} onClick={() => onExpand(k)}>
            {inner}
          </button>
        )}
      </li>
    );
  };
  return (
    <section aria-label={copy.map.title} className="flex flex-col gap-2.5" data-testid="home-map">
      {resolved.activated ? null : <Eyebrow>{copy.map.title}</Eyebrow>}
      <ul className="flex flex-col divide-y divide-hairline border-hairline border-y">
        {keys.map(row)}
      </ul>
    </section>
  );
}
