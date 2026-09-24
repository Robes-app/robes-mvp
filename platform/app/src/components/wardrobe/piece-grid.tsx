'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import type { Piece } from '@robes/contracts';
import { wardrobe } from '@robes/copy';
import { buttonClasses, Card, CardSkeleton, EmptyState, IconButton, Text } from '@robes/ui';
import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { anyReading } from '@/lib/wardrobe';
import { PieceImage } from './piece-image';
import { useRemovePiece } from './use-remove-piece';

const PAGE_SIZE = 30;
const READING_REFRESH_MS = 2000;
const SKELETON_SLOTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

export function PieceGrid() {
  const client = useApiClient();
  const remove = useRemovePiece();
  const query = useInfiniteQuery({
    // Under the wardrobe.list route key so optimistic edits and invalidations reach it.
    queryKey: [...queryKeys.route('wardrobe.list'), 'infinite'],
    queryFn: ({ pageParam, signal }) =>
      client.call('wardrobe.list', {
        input: { limit: PAGE_SIZE, ...(pageParam ? { cursor: pageParam } : {}) },
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    // Pieces fill in as their photos are read.
    refetchInterval: (q) => (anyReading(q.state.data?.pages) ? READING_REFRESH_MS : false),
  });
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (query.isError) {
    return (
      <Text role="alert" tone="danger">
        {errorCopy(query.error)}
      </Text>
    );
  }
  if (!query.data) return <GridSkeleton />;

  const pieces = query.data.pages.flatMap((p) => p.items);
  if (pieces.length === 0) {
    return (
      <EmptyState
        title={wardrobe.empty.title}
        body={wardrobe.empty.body}
        action={
          <Link href="/wardrobe/add" className={buttonClasses({ variant: 'primary' })}>
            {wardrobe.addPieces}
          </Link>
        }
      />
    );
  }
  return (
    <>
      <ul aria-label={wardrobe.segments.pieces} className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {pieces.map((piece, i) => (
          <li key={piece.id} className="relative">
            <PieceCard piece={piece} priority={i < 4} />
            <IconButton
              icon="trash"
              label={wardrobe.removePiece(piece.label)}
              onClick={() => remove.mutate({ params: { id: piece.id } })}
              className="absolute top-1 right-1 bg-bg/80"
            />
          </li>
        ))}
      </ul>
      <div ref={sentinel} aria-hidden className="h-px" />
      {isFetchingNextPage ? <GridSkeleton count={2} /> : null}
    </>
  );
}

function PieceCard({ piece, priority }: { piece: Piece; priority: boolean }) {
  return (
    <Link
      href={`/piece/${piece.id}`}
      aria-label={piece.label}
      className="block rounded-crisp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <Card
        media={
          <PieceImage piece={piece} priority={priority} sizes="(min-width: 768px) 25vw, 50vw" />
        }
        title={piece.label}
        meta={
          piece.status === 'reading'
            ? wardrobe.reading
            : piece.status === 'failed'
              ? wardrobe.noPieceFound
              : (piece.brand ?? undefined)
        }
      />
    </Link>
  );
}

function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul aria-busy className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {SKELETON_SLOTS.slice(0, count).map((slot) => (
        <li key={slot}>
          <CardSkeleton />
        </li>
      ))}
    </ul>
  );
}
