'use client';

import { useApi } from '@robes/api-client/react';
import type { Idea } from '@robes/contracts';
import { looks } from '@robes/copy';
import { buttonClasses, Card, CardSkeleton, EmptyState, Text } from '@robes/ui';
import Link from 'next/link';
import { errorCopy } from '@/lib/error-copy';
import { daysLeft } from '@/lib/looks';
import { IdeaFrame } from './idea-frame';

// Saved = ideas she kept; Ideas = Robes' unsaved output (auto-expires after 30 days).
export function IdeaGrid({ show }: { show: 'saved' | 'ideas' }) {
  const query = useApi('looks.ideas.list', { input: { limit: 60 } });
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
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <CardSkeleton />
          </li>
        ))}
      </ul>
    );
  }
  const items = query.data.items.filter((i) => (show === 'saved') === (i.savedAt !== null));
  if (items.length === 0) {
    const empty = show === 'saved' ? looks.saved.empty : looks.ideas.empty;
    return (
      <EmptyState
        title={empty.title}
        body={empty.body}
        action={
          show === 'ideas' ? (
            <Link href="/looks/style" className={buttonClasses({ variant: 'primary' })}>
              {looks.ideas.empty.action}
            </Link>
          ) : undefined
        }
      />
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {items.map((idea) => (
        <li key={idea.id}>
          <IdeaCard idea={idea} />
        </li>
      ))}
    </ul>
  );
}

function IdeaCard({ idea }: { idea: Idea }) {
  const first = idea.frames.find((f) => f.status === 'ready') ?? idea.frames[0];
  return (
    <Link
      href={`/looks/ideas/${idea.id}`}
      aria-label={idea.title}
      className="block rounded-crisp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
    >
      <Card
        as="article"
        media={<IdeaFrame frame={first} alt="" sizes="(min-width: 768px) 33vw, 50vw" />}
        title={idea.title}
        meta={
          idea.savedAt === null && idea.expiresAt
            ? looks.ideas.expires(daysLeft(idea.expiresAt))
            : (idea.subtitle ?? undefined)
        }
      />
    </Link>
  );
}
