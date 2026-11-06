'use client';

import { useApi } from '@robes/api-client/react';
import type { DiaryDay, DiaryDraft } from '@robes/contracts';
import { diary, lookbook } from '@robes/copy';
import { weekdayDay } from '@robes/core/calendar';
import { shortRange } from '@robes/core/weather';
import { Icon } from '@robes/icons/web';
import { Image, Skeleton } from '@robes/ui';
import Link from 'next/link';
import { useDressingLine } from '@/components/looks/draft-page';
import { LookImage } from '@/components/looks/look-image';
import { ScanLine } from '@/components/looks/scan-line';
import { PieceImage } from '@/components/wardrobe/piece-image';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const d = lookbook.draft;

// The draft tile in the day's slot (Front Door design 3b, plan 2026-11-03 §1.2): where Add look
// stood. Dressing — the bare model under the scan line, the day's reading, the lines, the rack's
// thumbs landing; then the draft, its bar opening the page; ↻ asks for another take, same brief.
// The native twin is mobile/src/features/home/DraftTile.tsx.
export function DraftTile({
  draft,
  day,
  today,
  onAnother,
  anotherBusy,
}: {
  draft: DiaryDraft;
  day: DiaryDay;
  today: string;
  onAnother: (lookId: string) => void;
  anotherBusy: boolean;
}) {
  const look = draft.look;
  const model = useApi('me.model.get', undefined, { enabled: !look?.image });
  // Dressing until a picture lands; a job still running with nothing drawn is dressing too.
  const generating =
    anotherBusy || !look || look.framePending || (!look.image && draft.jobId !== null);
  const line = useDressingLine(anotherBusy ? d.linesAgain : d.linesFirst, generating);
  const stand = model.data?.stand?.imageUrl ?? null;
  const read = [
    day.date === today ? diary.today : weekdayDay(day.date),
    day.weather?.city ?? null,
    day.weather ? shortRange(day.weather.tempRange) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const href = look ? `/look/${look.id}?day=${day.date}` : null;
  const thumbs = look?.pieces.slice(0, 5) ?? [];
  const stale = !generating && look?.pictureStale === true;
  return (
    <article
      data-testid="draft-tile"
      data-state={generating ? 'generating' : 'ready'}
      className="flex w-full shrink-0 snap-start flex-col overflow-hidden rounded-tile border-[0.5px] border-rule-mid bg-surface-raised"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        <div
          className={`transition-[opacity,filter] duration-500 ${generating ? 'opacity-55' : stale ? 'opacity-80 grayscale-[.75]' : ''}`}
        >
          {look?.image ? (
            <LookImage look={look} sizes="(min-width: 640px) 560px, 80vw" />
          ) : stand ? (
            <Image src={stand} alt="" aspect="4:5" />
          ) : (
            <Skeleton className="aspect-[4/5] w-full" />
          )}
        </div>
        {generating ? (
          <>
            <ScanLine />
            <div
              role="status"
              className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-bg/90 to-transparent px-4 pt-10 pb-4"
            >
              <p className="flex items-center gap-2 font-medium font-sans text-[9px] text-ink-muted uppercase tracking-[0.2em]">
                <Icon
                  name="looks"
                  size={14}
                  className="motion-safe:animate-pulse text-accent-inspire"
                />
                {read}
              </p>
              <p className="font-display text-[19px] font-light text-ink italic leading-7">
                {line}
              </p>
              <p className="font-sans text-[10px] text-ink-faint">{d.usually}</p>
            </div>
          </>
        ) : null}
        {stale ? (
          <span
            title={d.stale}
            className="absolute top-3 left-3 z-10 flex h-[22px] min-w-[22px] items-center justify-center rounded-pill bg-ink px-1.5 font-medium font-sans text-[10px] text-bg"
          >
            <span aria-hidden>1</span>
            <span className="sr-only">{d.behind(1)}</span>
          </span>
        ) : null}
        {!generating && look?.setId ? (
          <button
            type="button"
            onClick={() => onAnother(look.id)}
            aria-label={d.tileRegen}
            title={d.tileRegen}
            className={`absolute bottom-3 left-3 z-10 flex size-9 items-center justify-center rounded-pill bg-bg/95 text-ink ${focus}`}
          >
            <Icon name="undo" size={15} className="-scale-x-100" />
          </button>
        ) : null}
      </div>
      {generating && thumbs.length ? (
        <div className="flex items-center gap-2.5 border-hairline border-t px-3.5 py-2">
          <span className="font-medium font-sans text-[9px] text-ink-faint uppercase tracking-[0.2em]">
            {d.rack}
          </span>
          <ul className="flex gap-1.5">
            {thumbs.map((p) => (
              <li
                key={p.piece.id}
                className="h-[42px] w-[34px] overflow-hidden rounded-[4px] border border-rule-mid bg-surface-raised"
              >
                <PieceImage piece={p.piece} sizes="34px" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {href && !generating ? (
        <Link
          href={href}
          aria-label={d.open}
          className={`flex min-h-[45px] items-center justify-center gap-1.5 bg-surface px-3.5 font-medium font-sans text-[10px] text-ink uppercase tracking-[0.16em] ${focus}`}
        >
          {d.tileBar}
          <span aria-hidden className="font-light text-[15px] text-ink-faint">
            ›
          </span>
        </Link>
      ) : (
        <span className="flex min-h-[45px] items-center justify-center bg-surface px-3.5 font-medium font-sans text-[10px] text-ink-faint uppercase tracking-[0.16em]">
          {d.tileDressing}
        </span>
      )}
    </article>
  );
}
