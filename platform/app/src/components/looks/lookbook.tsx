'use client';

import { lookbook as copy } from '@robes/copy';
import { type LookSort, SORT_FROM, SORTS, sortLooks } from '@robes/core/looks';
import {
  buttonClasses,
  CardSkeleton,
  EmptyState,
  ErrorText,
  Pill,
  SegmentedControl,
  Text,
} from '@robes/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorCopy } from '@/lib/error-copy';
import { useLetGo, useLooksByStatus, useRestyle } from '@/lib/look-states';
import { NewLookBox } from './look-prompt-box';
import { DraftTile, SavedTile, SuggestedTile } from './look-tiles';

export type LookbookTab = 'saved' | 'suggested';
const TABS = [
  { value: 'saved', label: copy.tabs.saved },
  { value: 'suggested', label: copy.tabs.suggested },
] as const;
const SKELETONS = ['a', 'b', 'c'] as const;

// The Lookbook (legacy F2–F7): Saved | Suggested, the count line beneath, + on Saved alone;
// drafts lead Saved as an In progress rail.
export function Lookbook({ tab }: { tab: LookbookTab }) {
  const router = useRouter();
  const saved = useLooksByStatus('saved');
  const drafts = useLooksByStatus('draft');
  const suggested = useLooksByStatus('suggested');
  const restyle = useRestyle();
  const letGo = useLetGo();
  const [sort, setSort] = useState<LookSort>('newest');
  const current = tab === 'saved' ? saved : suggested;
  const raw = current.data?.items ?? [];
  const sortable = tab === 'saved' && raw.length >= SORT_FROM;
  const items = sortable ? sortLooks(raw, sort) : raw;
  const draftItems = drafts.data?.items ?? [];
  const count =
    tab === 'saved'
      ? [
          items.length ? copy.count.looks(items.length) : null,
          draftItems.length ? copy.count.inProgress(draftItems.length) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : items.length
        ? copy.count.suggested(items.length)
        : '';
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label={copy.title}
          options={TABS}
          value={tab}
          onChange={(t) => router.replace(t === 'saved' ? '/looks' : '/looks?tab=suggested')}
        />
        {tab === 'saved' ? (
          <Link href="/looks/new" className={buttonClasses({ variant: 'secondary' })}>
            {copy.newLook}
          </Link>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {count ? (
          <Text size="small" tone="muted" data-testid="looks-count">
            {count}
          </Text>
        ) : (
          <span />
        )}
        {sortable ? (
          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">{copy.sort.label}</legend>
            {SORTS.map((s) => (
              <Pill key={s} selected={sort === s} onClick={() => setSort(s)}>
                {copy.sort[s]}
              </Pill>
            ))}
          </fieldset>
        ) : null}
      </div>
      {tab === 'saved' && draftItems.length ? (
        <section aria-labelledby="in-progress" className="flex flex-col gap-2">
          <Text id="in-progress" size="caption" tone="muted" className="uppercase tracking-wider">
            {copy.inProgress}
          </Text>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {draftItems.map((l) => (
              <DraftTile key={l.id} look={l} />
            ))}
          </div>
        </section>
      ) : null}
      {current.isError ? (
        <ErrorText>{errorCopy(current.error)}</ErrorText>
      ) : !current.data ? (
        <ul aria-busy className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {SKELETONS.map((k) => (
            <li key={k}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        tab === 'saved' ? (
          draftItems.length ? null : (
            <EmptyState
              title={copy.savedEmpty.title}
              body={copy.savedEmpty.body}
              action={
                <Link href="/looks/new" className={buttonClasses({ variant: 'primary' })}>
                  {copy.newLook}
                </Link>
              }
            />
          )
        ) : (
          <div className="flex flex-col gap-4">
            <EmptyState title={copy.suggestedEmpty.title} body={copy.suggestedEmpty.body} />
            <NewLookBox />
          </div>
        )
      ) : (
        <ul aria-label={copy.tabs[tab]} className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {items.map((look, i) => (
            <li key={look.id}>
              {tab === 'saved' ? (
                <SavedTile look={look} priority={i < 3} />
              ) : (
                <SuggestedTile
                  look={look}
                  onRemove={() => letGo(look.id)}
                  onSwap={() => restyle.restyle(look.id)}
                  swapping={restyle.busyId === look.id}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
