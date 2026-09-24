'use client';

import { queryKeys, useApiClient } from '@robes/api-client/react';
import { looks } from '@robes/copy';
import { buttonClasses, CardSkeleton, EmptyState, Text } from '@robes/ui';
import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { LookCard } from './look-card';

const PAGE_SIZE = 30;
const SKELETONS = ['a', 'b', 'c'] as const;

// Looks › Saved: her Look entities, newest first, loaded as she scrolls.
export function LookGrid() {
  const client = useApiClient();
  const query = useInfiniteQuery({
    queryKey: [...queryKeys.route('looks.list'), 'infinite'],
    queryFn: ({ pageParam, signal }) =>
      client.call('looks.list', {
        input: { limit: PAGE_SIZE, ...(pageParam ? { cursor: pageParam } : {}) },
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
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
  if (!query.data) {
    return (
      <ul aria-busy className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {SKELETONS.map((k) => (
          <li key={k}>
            <CardSkeleton />
          </li>
        ))}
      </ul>
    );
  }
  const items = query.data.pages.flatMap((p) => p.items);
  if (items.length === 0) {
    return (
      <EmptyState
        title={looks.savedList.empty.title}
        body={looks.savedList.empty.body}
        action={
          <Link href="/looks/new" className={buttonClasses({ variant: 'primary' })}>
            {looks.savedList.empty.action}
          </Link>
        }
      />
    );
  }
  return (
    <>
      <ul aria-label={looks.title} className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((look, i) => (
          <li key={look.id}>
            <LookCard look={look} priority={i < 3} />
          </li>
        ))}
      </ul>
      <div ref={sentinel} aria-hidden className="h-px" />
    </>
  );
}
