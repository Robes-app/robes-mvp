'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { lookbook, wardrobe } from '@robes/copy';
import {
  Button,
  buttonClasses,
  Chip,
  ErrorText,
  Field,
  Heading,
  Skeleton,
  Text,
  TextArea,
} from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { SuggestedRail } from '@/components/looks/suggested-rail';
import { PieceImage } from '@/components/wardrobe/piece-image';
import { useRemovePiece } from '@/components/wardrobe/use-remove-piece';
import { errorCopy } from '@/lib/error-copy';
import { pieceIsReading } from '@/lib/wardrobe';

const copy = wardrobe.piece;
const READING_REFRESH_MS = 2000;

type Draft = Record<'label' | 'brand' | 'color' | 'size' | 'notes', string>;

function toDraft(p: Piece): Draft {
  return {
    label: p.label,
    brand: p.brand ?? '',
    color: p.color ?? '',
    size: p.size ?? '',
    notes: p.notes ?? '',
  };
}

const orNull = (v: string): string | null => (v.trim() ? v.trim() : null);

export function PieceDetail({ id, saw = false }: { id: string; saw?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.list') });
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
        color: orNull(draft.color),
        size: orNull(draft.size),
        notes: orNull(draft.notes),
      },
    });
  }

  const set = (key: keyof Draft) => (value: string) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <PieceImage piece={piece} sizes="(min-width: 768px) 50vw, 100vw" priority />
      <div className="flex flex-col gap-6">
        {saw && piece.status !== 'failed' ? <Saw piece={piece} /> : null}
        <header className="flex flex-col gap-3">
          {/* Until Robes has read it, "New piece" and "Other" are placeholders, not facts. */}
          <Heading
            level={1}
            size="xl"
            italic={piece.status !== 'ready'}
            tone={piece.status === 'ready' ? 'default' : 'faint'}
          >
            {piece.label}
          </Heading>
          {piece.status === 'ready' ? (
            <div className="flex flex-wrap gap-2">
              <Chip>{piece.category}</Chip>
              {piece.categoryL2 ? <Chip>{piece.categoryL2}</Chip> : null}
            </div>
          ) : null}
          {piece.status === 'reading' ? (
            <Text role="status" tone="muted">
              {wardrobe.reading}
            </Text>
          ) : null}
          {piece.status === 'failed' ? <ErrorText>{wardrobe.noPieceFound}</ErrorText> : null}
        </header>
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
              label={copy.label}
              name="label"
              required
              maxLength={120}
              value={draft.label}
              onChange={(e) => set('label')(e.target.value)}
            />
            <Field
              label={copy.brand}
              name="brand"
              maxLength={80}
              value={draft.brand}
              onChange={(e) => set('brand')(e.target.value)}
            />
            <Field
              label={copy.color}
              name="color"
              maxLength={60}
              value={draft.color}
              onChange={(e) => set('color')(e.target.value)}
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
    [wardrobe.saw.rows.colour, piece.color],
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
                  {v || '—'}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/wardrobe" className={buttonClasses({ variant: 'secondary' })}>
              {wardrobe.saw.keep} →
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
