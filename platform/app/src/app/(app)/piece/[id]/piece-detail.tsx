'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Piece, UpdatePieceInput } from '@robes/contracts';
import { lookbook, looks as looksCopy, wardrobe } from '@robes/copy';
import { dayMonth, longDate } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import {
  Button,
  buttonClasses,
  ErrorText,
  Eyebrow,
  Heading,
  IconButton,
  Skeleton,
  Text,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { HomeBox } from '@/components/home/home-box';
import { SavedTile } from '@/components/looks/look-tiles';
import { SuggestedRail } from '@/components/looks/suggested-rail';
import { StarButton } from '@/components/wardrobe/piece-card';
import { type PieceField, PieceFieldSheet } from '@/components/wardrobe/piece-field-sheet';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { RecordRows } from '@/components/wardrobe/piece-rows';
import { usePiecePhoto } from '@/components/wardrobe/use-piece-photo';
import { useRemovePiece } from '@/components/wardrobe/use-remove-piece';
import { useStarPiece } from '@/components/wardrobe/use-star-piece';
import { errorCopy } from '@/lib/error-copy';
import { PHOTO_ACCEPT } from '@/lib/upload';
import { invalidateWardrobe, pieceIsReading } from '@/lib/wardrobe';

const copy = wardrobe.piece;
const READING_REFRESH_MS = 2000;
const LOOKS_LIMIT = 30;

// The record (legacy Piece_Sheet 01): the photograph, her name for it with the pencil on it, the
// facts she has given, then the days she wore it. Every fact is a row that opens its own drawer —
// there is no form, so what the title says and what a row says can never disagree.
export function PieceDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const star = useStarPiece();
  const [field, setField] = useState<PieceField | null>(null);
  const query = useApi(
    'wardrobe.get',
    { params: { id } },
    { refetchInterval: (q) => (pieceIsReading(q.state.data) ? READING_REFRESH_MS : false) },
  );
  const piece = query.data;

  const update = useApiMutation('wardrobe.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('wardrobe.get', { params: { id } }), data);
      void invalidateWardrobe(queryClient);
    },
  });
  const remove = useRemovePiece();
  const [styling, setStyling] = useState(false);

  if (query.isError) return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  if (!piece) {
    return (
      <div aria-busy className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <Skeleton className="aspect-[4/5]" />
        <Skeleton shape="text" className="h-10 w-2/3" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  const save = (input: UpdatePieceInput) => update.mutate({ params: { id }, input });
  const ready = piece.status === 'ready';

  return (
    // Beta's two columns (Robes_Piece_IA): the piece — photograph, name, stats, rows — at 38% from
    // 1024px, the record beside it; one column, photograph first, below.
    <article className="mx-auto grid w-full max-w-xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-[clamp(360px,38%,560px)_minmax(0,1fr)] lg:items-start lg:gap-14">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="relative overflow-hidden rounded-soft border border-hairline bg-surface-raised">
          <PieceImage
            piece={piece}
            contain
            sizes="(min-width: 1024px) 560px, (min-width: 768px) 576px, 100vw"
            priority
          />
          <ChangePhoto id={id} hasPhoto={piece.image !== null} />
        </div>

        <header className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-1 items-start gap-2">
              {/* Until Robes has read it, "New piece" is a placeholder, not a fact. */}
              <Heading
                level={1}
                size="xl"
                className="min-w-0"
                italic={!ready}
                tone={ready ? 'default' : 'faint'}
              >
                {piece.label}
              </Heading>
              {/* The pencil edits the name where it is written, never a field further down. */}
              <IconButton icon="pencil" label={copy.editName} onClick={() => setField('label')} />
            </span>
            <StarButton
              label={piece.label}
              on={piece.heroPosition !== null}
              onToggle={() => star.toggle(piece)}
            />
          </div>
          {/* The brand is its own line, and says so when it is missing — one source, the saved piece. */}
          <button
            type="button"
            onClick={() => setField('brand')}
            className="self-start font-display text-lg text-ink-muted italic"
          >
            {piece.brand ?? copy.addBrand}
          </button>
          {piece.status === 'reading' ? (
            <Text role="status" tone="muted">
              {wardrobe.reading}
            </Text>
          ) : null}
          {piece.status === 'failed' ? <ErrorText>{wardrobe.noPieceFound}</ErrorText> : null}
        </header>

        {ready ? <Stats piece={piece} /> : null}

        <div className="flex flex-wrap items-center gap-3">
          {/* The piece page's door opens the new-look box with the piece inside it (legacy ✦), so
              her words and the balance question ride along like every other new look. */}
          <Button variant="primary" disabled={!ready} onClick={() => setStyling((v) => !v)}>
            {copy.stylePiece}
          </Button>
          {ready ? (
            <Link
              href={`/looks/new?pieceId=${id}`}
              className={buttonClasses({ variant: 'secondary' })}
            >
              {lookbook.startLook}
            </Link>
          ) : null}
        </div>
        {styling && ready ? (
          <HomeBox initialPiece={piece} hasPieces autoFocus fromHome={false} />
        ) : null}

        <RecordRows values={piece} onField={setField} />
        {update.isError ? <ErrorText>{errorCopy(update.error)}</ErrorText> : null}
      </div>

      <div className="flex min-w-0 flex-col gap-8">
        <Wears pieceId={id} />
        <InLooks pieceId={id} />
        <SuggestedRail pieceId={id} />

        {/* Destructive, so away from the primary action; Undo follows in a toast. */}
        <Button
          variant="quiet"
          className="self-center"
          onClick={() => {
            remove.mutate({ params: { id } });
            router.push('/wardrobe');
          }}
        >
          {copy.remove}
        </Button>
      </div>

      <PieceFieldSheet
        piece={piece}
        field={field}
        onClose={() => setField(null)}
        onSave={save}
        saving={update.isPending}
      />
    </article>
  );
}

// The pill at the photograph's bottom-right (legacy rb-pc-rephoto): ↻ Change photo, or the camera
// when there is none yet. Native twin: ChangePhoto in mobile/src/features/wardrobe/PieceDetail.tsx.
function ChangePhoto({ id, hasPhoto }: { id: string; hasPhoto: boolean }) {
  const file = useRef<HTMLInputElement>(null);
  const photo = usePiecePhoto(id);
  const label = hasPhoto ? copy.changePhoto : copy.addPhoto;
  return (
    <>
      <button
        type="button"
        onClick={() => file.current?.click()}
        disabled={photo.busy}
        aria-busy={photo.busy}
        className="absolute right-3.5 bottom-3.5 z-10 flex min-h-11 items-center gap-2 rounded-pill border border-hairline bg-bg/95 pr-4 pl-3.5 font-sans text-ink text-sm shadow-sm hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:text-ink-faint"
      >
        <Icon name={hasPhoto ? 'swap' : 'camera'} size={16} />
        {label}
      </button>
      <input
        ref={file}
        type="file"
        accept={PHOTO_ACCEPT}
        // The pill is the door; the input itself is hidden from assistive tech.
        aria-hidden
        aria-label={label}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          void photo.change(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </>
  );
}

// Worn · Last worn · In looks, as beta's strip reads them: facts side by side under the name,
// between two hairlines. The native twin is Stats in mobile/src/features/wardrobe/PieceDetail.tsx.
function Stats({ piece }: { piece: Piece }) {
  const wears = useApi('wardrobe.wears', { params: { id: piece.id } });
  const looks = useApi('looks.list', { input: { limit: LOOKS_LIMIT, pieceId: piece.id } });
  const last = wears.data?.items[0]?.wornOn;
  const cells: [string, string][] = [
    [
      copy.stats.worn,
      piece.wearCount ? looksCopy.page.wears.count(piece.wearCount) : copy.stats.never,
    ],
    [copy.stats.lastWorn, last ? dayMonth(last) : '—'],
    [copy.stats.inLooks, looks.data ? String(looks.data.items.length) : '—'],
  ];
  return (
    <dl className="grid grid-cols-3 border-hairline border-y">
      {cells.map(([k, v], i) => (
        <div
          key={k}
          className={`flex min-w-0 flex-col gap-1.5 py-3 ${i ? 'border-hairline border-l pl-3.5' : ''}`}
        >
          <dt>
            <Eyebrow>{k}</Eyebrow>
          </dt>
          <dd>
            <Text size="small" className="truncate">
              {v}
            </Text>
          </dd>
        </div>
      ))}
    </dl>
  );
}

// "In N looks": the saved looks she has put this piece on, drawn as the Lookbook draws them.
function InLooks({ pieceId }: { pieceId: string }) {
  const query = useApi('looks.list', { input: { limit: LOOKS_LIMIT, pieceId } });
  const items = query.data?.items ?? [];
  if (query.isPending) return <Skeleton shape="text" className="h-4 w-40" />;
  return (
    <section aria-labelledby="piece-looks" className="flex flex-col gap-2">
      <Eyebrow id="piece-looks">
        {items.length ? copy.sections.looks(items.length) : copy.sections.noLooks}
      </Eyebrow>
      {items.length ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((look) => (
            <li key={look.id}>
              <SavedTile look={look} />
            </li>
          ))}
        </ul>
      ) : (
        <Text size="small" tone="muted" italic>
          {copy.sections.noLooksHint}
        </Text>
      )}
    </section>
  );
}

// The piece's own record: the days it was on her, and the look she wore it in.
function Wears({ pieceId }: { pieceId: string }) {
  const query = useApi('wardrobe.wears', { params: { id: pieceId } });
  const items = query.data?.items ?? [];
  const undated = query.data?.undated ?? 0;
  // Nothing worn yet: the stats strip already says so, so the section stands down (beta).
  if (query.isPending) return <Skeleton shape="text" className="h-4 w-40" />;
  if (items.length === 0 && !undated) return null;
  return (
    <section aria-labelledby="piece-wears" className="flex flex-col gap-2">
      <Eyebrow id="piece-wears">{copy.sections.wears}</Eyebrow>
      {items.length ? (
        <ul className="flex flex-col divide-y divide-hairline overflow-hidden rounded-crisp border border-hairline bg-surface">
          {items.map((wear) => (
            <li key={wear.id}>
              <Link
                href={`/plan/${wear.wornOn}`}
                aria-label={copy.wears.openDay(longDate(wear.wornOn))}
                className="flex min-h-12 items-center gap-3 px-4 py-3 hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
              >
                <Text size="small" className="shrink-0">
                  {dayMonth(wear.wornOn)}
                </Text>
                <Text size="caption" tone="faint" italic className="min-w-0 flex-1 truncate">
                  {wear.lookName ?? ''}
                </Text>
                <Icon name="forward" size={15} className="shrink-0 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {undated ? (
        <Text size="caption" tone="faint" italic>
          {copy.wears.undated(undated)}
        </Text>
      ) : null}
    </section>
  );
}
