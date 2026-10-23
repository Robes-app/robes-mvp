'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { lookbook, wardrobe } from '@robes/copy';
import type { PieceColour } from '@robes/core/colour';
import { Icon } from '@robes/icons/web';
import {
  Button,
  buttonClasses,
  Chip,
  ErrorText,
  Field,
  Heading,
  IconButton,
  Skeleton,
  Text,
  TextArea,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { SuggestedRail } from '@/components/looks/suggested-rail';
import { ColourField, colourSummary } from '@/components/wardrobe/colour-field';
import { StarButton } from '@/components/wardrobe/piece-card';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { useRemovePiece } from '@/components/wardrobe/use-remove-piece';
import { useStarPiece } from '@/components/wardrobe/use-star-piece';
import { errorCopy } from '@/lib/error-copy';
import { invalidateWardrobe, pieceIsReading } from '@/lib/wardrobe';

const copy = wardrobe.piece;
const READING_REFRESH_MS = 2000;

type Draft = Record<'label' | 'brand' | 'size' | 'notes', string> & { colour: PieceColour };

const colourOf = (p: Piece): PieceColour => ({
  colourShade: p.colourShade,
  colourExtra: p.colourExtra,
  print: p.print,
});

function toDraft(p: Piece): Draft {
  return {
    label: p.label,
    brand: p.brand ?? '',
    colour: colourOf(p),
    size: p.size ?? '',
    notes: p.notes ?? '',
  };
}

const orNull = (v: string): string | null => (v.trim() ? v.trim() : null);

export function PieceDetail({ id, saw = false }: { id: string; saw?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const labelId = useId();
  const brandId = useId();
  const star = useStarPiece();
  const query = useApi(
    'wardrobe.get',
    { params: { id } },
    { refetchInterval: (q) => (pieceIsReading(q.state.data) ? READING_REFRESH_MS : false) },
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState(false);
  const piece = query.data;

  useEffect(() => {
    if (piece && !pieceIsReading(piece)) setDraft((d) => d ?? toDraft(piece));
  }, [piece]);

  const update = useApiMutation('wardrobe.update', {
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.call('wardrobe.get', { params: { id } }), data);
      void invalidateWardrobe(queryClient);
      setSaved(true);
    },
  });
  const remove = useRemovePiece();
  const style = useApiMutation('looks.generate', {
    onSuccess: ({ jobId }) => router.push(`/looks/style/${jobId}`),
  });

  if (query.isError) {
    return <ErrorText>{errorCopy(query.error)}</ErrorText>;
  }
  if (!piece) {
    return (
      <div aria-busy className="grid gap-8 md:grid-cols-2">
        <Skeleton className="aspect-[4/5]" />
        <div className="flex flex-col gap-4">
          <Skeleton shape="text" className="h-10 w-2/3" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setSaved(false);
    update.mutate({
      params: { id },
      input: {
        label: draft.label.trim(),
        brand: orNull(draft.brand),
        ...draft.colour,
        size: orNull(draft.size),
        notes: orNull(draft.notes),
      },
    });
  }

  const set = (key: Exclude<keyof Draft, 'colour'>) => (value: string) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <article className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PieceImage piece={piece} sizes="(min-width: 768px) 640px, 100vw" priority />
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="flex items-start gap-2">
                {/* Until Robes has read it, "New piece" and "Other" are placeholders, not facts. */}
                <Heading
                  level={1}
                  size="xl"
                  italic={piece.status !== 'ready'}
                  tone={piece.status === 'ready' ? 'default' : 'faint'}
                >
                  {piece.label}
                </Heading>
                <IconButton
                  icon="pencil"
                  label={copy.editName}
                  onClick={() => document.getElementById(labelId)?.focus()}
                />
              </span>
              {/* The brand is its own line, and says so when it is missing. */}
              <button
                type="button"
                onClick={() => document.getElementById(brandId)?.focus()}
                className="self-start font-display text-ink-muted text-lg italic"
              >
                {piece.brand ?? copy.addBrand}
              </button>
            </div>
            <StarButton
              label={piece.label}
              on={piece.heroPosition !== null}
              onToggle={() => star.toggle(piece)}
            />
          </div>
          {piece.status === 'ready' ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Chip>{piece.category}</Chip>
                {piece.categoryL2 ? <Chip>{piece.categoryL2}</Chip> : null}
              </div>
              <Text
                size="small"
                tone={piece.wearCount ? 'muted' : 'default'}
                className={piece.wearCount ? '' : 'text-accent-warm'}
              >
                {piece.wearCount ? wardrobe.card.worn(piece.wearCount) : wardrobe.card.neverWorn}
              </Text>
            </>
          ) : null}
          {piece.status === 'reading' ? (
            <Text role="status" tone="muted">
              {wardrobe.reading}
            </Text>
          ) : null}
          {piece.status === 'failed' ? <ErrorText>{wardrobe.noPieceFound}</ErrorText> : null}
        </header>
        {saw && piece.status !== 'failed' ? <Saw piece={piece} /> : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            disabled={piece.status !== 'ready'}
            loading={style.isPending || style.isSuccess}
            onClick={() => style.mutate({ input: { anchor: { type: 'piece', pieceId: id } } })}
          >
            {copy.stylePiece}
          </Button>
          {piece.status === 'ready' ? (
            <Link
              href={`/looks/new?pieceId=${id}`}
              className={buttonClasses({ variant: 'secondary' })}
            >
              {lookbook.startLook}
            </Link>
          ) : null}
        </div>
        {style.isError ? <ErrorText>{errorCopy(style.error)}</ErrorText> : null}
        <SuggestedRail pieceId={id} />
        {draft ? (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field
              id={labelId}
              label={copy.label}
              name="label"
              required
              maxLength={120}
              value={draft.label}
              onChange={(e) => set('label')(e.target.value)}
            />
            <Field
              id={brandId}
              label={copy.brand}
              name="brand"
              maxLength={80}
              value={draft.brand}
              onChange={(e) => set('brand')(e.target.value)}
            />
            <ColourField
              value={draft.colour}
              check={piece.colourCheck}
              onChange={(colour) => setDraft((d) => (d ? { ...d, colour } : d))}
            />
            <Field
              label={copy.size}
              name="size"
              maxLength={40}
              value={draft.size}
              onChange={(e) => set('size')(e.target.value)}
            />
            <TextArea
              label={copy.notes}
              name="notes"
              maxLength={1000}
              value={draft.notes}
              onChange={(e) => set('notes')(e.target.value)}
            />
            <Button
              type="submit"
              disabled={!draft.label.trim()}
              loading={update.isPending}
              loadingLabel={copy.saving}
              className="self-start"
            >
              {copy.save}
            </Button>
            <Text role="status" size="small" tone="muted" className="min-h-5">
              {saved ? copy.saved : ''}
            </Text>
            {update.isError ? <ErrorText>{errorCopy(update.error)}</ErrorText> : null}
          </form>
        ) : null}
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
      </div>
    </article>
  );
}

// Beta's reveal: what Robes filed, row by row, once it has read the piece; the form below adjusts.
function Saw({ piece }: { piece: Piece }) {
  const rows: [string, string | null][] = [
    [wardrobe.saw.rows.piece, piece.label],
    [wardrobe.saw.rows.category, [piece.category, piece.categoryL2].filter(Boolean).join(' · ')],
    [wardrobe.saw.rows.colour, colourSummary(colourOf(piece)) || piece.color],
    [wardrobe.saw.rows.brand, piece.brand],
  ];
  return (
    <section aria-labelledby="saw-title" className="flex flex-col gap-3">
      <h2 id="saw-title" className="font-display font-light text-3xl text-ink">
        {wardrobe.saw.title}
      </h2>
      {piece.status === 'ready' ? (
        <>
          <dl className="flex flex-col divide-y divide-hairline border-hairline border-y">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-3 py-2">
                <dt className="flex-1 font-medium font-sans text-ink-muted text-xs uppercase tracking-[0.2em]">
                  {k}
                </dt>
                <dd
                  className={
                    v ? 'font-sans text-ink text-sm' : 'font-display text-ink-faint text-lg italic'
                  }
                >
                  {v || wardrobe.saw.unread}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/wardrobe" className={buttonClasses({ variant: 'secondary' })}>
              {wardrobe.saw.keep}
              <Icon name="forward" size={16} />
            </Link>
            <Text size="small" tone="muted" italic>
              {wardrobe.saw.adjust}
            </Text>
          </div>
        </>
      ) : (
        <Text role="status" size="small" tone="muted" italic>
          {wardrobe.saw.reading}
        </Text>
      )}
    </section>
  );
}
