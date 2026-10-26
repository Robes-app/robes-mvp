'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Piece, UpdatePieceInput } from '@robes/contracts';
import { lookbook, wardrobe } from '@robes/copy';
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
import { useState } from 'react';
import { SuggestedRail } from '@/components/looks/suggested-rail';
import { StarButton } from '@/components/wardrobe/piece-card';
import { type PieceField, PieceFieldSheet } from '@/components/wardrobe/piece-field-sheet';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { RecordRows } from '@/components/wardrobe/piece-rows';
import { useRemovePiece } from '@/components/wardrobe/use-remove-piece';
import { useStarPiece } from '@/components/wardrobe/use-star-piece';
import { errorCopy } from '@/lib/error-copy';
import { invalidateWardrobe, pieceIsReading } from '@/lib/wardrobe';

const copy = wardrobe.piece;
const READING_REFRESH_MS = 2000;

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
  const style = useApiMutation('looks.generate', {
    onSuccess: ({ jobId }) => router.push(`/looks/style/${jobId}`),
  });

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
    <article className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PieceImage piece={piece} sizes="(min-width: 768px) 640px, 100vw" priority />

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
        <Button
          variant="primary"
          disabled={!ready}
          loading={style.isPending || style.isSuccess}
          onClick={() => style.mutate({ input: { anchor: { type: 'piece', pieceId: id } } })}
        >
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
      {style.isError ? <ErrorText>{errorCopy(style.error)}</ErrorText> : null}

      <RecordRows values={piece} onField={setField} />

      <Wears pieceId={id} />
      <SuggestedRail pieceId={id} />

      {update.isError ? <ErrorText>{errorCopy(update.error)}</ErrorText> : null}

      {/* Destructive, so away from the primary action; Undo follows in a toast. */}
      <Button
        variant="quiet"
        className="self-start border-hairline border-t pt-4"
        onClick={() => {
          remove.mutate({ params: { id } });
          router.push('/wardrobe');
        }}
      >
        {copy.remove}
      </Button>

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

// Worn · Last worn, as beta's strip reads them: facts, side by side, under the name.
function Stats({ piece }: { piece: Piece }) {
  const cells: [string, string][] = [
    [copy.stats.worn, piece.wearCount ? wardrobe.card.worn(piece.wearCount) : copy.stats.never],
  ];
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-crisp border border-hairline bg-surface">
      {cells.map(([k, v], i) => (
        <div key={k} className={`flex flex-col gap-1 p-3 ${i ? 'border-hairline border-l' : ''}`}>
          <dt>
            <Eyebrow>{k}</Eyebrow>
          </dt>
          <dd>
            <Text size="small">{v}</Text>
          </dd>
        </div>
      ))}
    </dl>
  );
}

// The piece's own record: the days it was on her, and the look she wore it in.
function Wears({ pieceId }: { pieceId: string }) {
  const query = useApi('wardrobe.wears', { params: { id: pieceId } });
  const items = query.data?.items ?? [];
  const undated = query.data?.undated ?? 0;
  return (
    <section aria-labelledby="piece-wears" className="flex flex-col gap-2">
      <Eyebrow id="piece-wears">{copy.sections.wears}</Eyebrow>
      {query.isPending ? (
        <Skeleton shape="text" className="h-4 w-40" />
      ) : items.length === 0 && !undated ? (
        <Text size="small" tone="muted" italic>
          {copy.wears.none}
        </Text>
      ) : (
        <>
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
          {undated ? (
            <Text size="caption" tone="faint" italic>
              {copy.wears.undated(undated)}
            </Text>
          ) : null}
        </>
      )}
    </section>
  );
}
