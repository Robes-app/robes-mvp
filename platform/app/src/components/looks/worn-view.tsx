'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook, looks as looksCopy } from '@robes/copy';
import { longDate, weekdayDayMonth } from '@robes/core/calendar';
import { wearDiff } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { ErrorText, Skeleton, Subview, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useAnalytics } from '@/components/analytics-provider';
import { errorCopy } from '@/lib/error-copy';

const copy = lookbook.savedLook.wornView;
const wears = looksCopy.page.wears;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Felix's WornView: the dates a look was worn, newest first, each on its own row with the wear's
// note and an × (a wear is a fact: deleted, never edited). "+ Add a date" opens `DiarySheet`, the
// one drawer that logs a date. The row opens its day. Native twin:
// mobile/src/features/looks/WornView.tsx.
export function WornView({
  look,
  open,
  onBack,
  onAddDate,
}: {
  look: Look;
  open: boolean;
  onBack: () => void;
  onAddDate: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { track } = useAnalytics().analytics;
  const query = useApi('looks.wears', { params: { id: look.id } }, { enabled: open });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.wears') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
  };
  const remove = useApiMutation('looks.unwear', {
    onSuccess: () => {
      track('wear_undone');
      toast({ message: wears.removed });
      refresh();
    },
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const items = query.data?.items ?? [];
  const labelOf = (id: string) => look.pieces.find((p) => p.piece.id === id)?.piece.label ?? null;
  return (
    <Subview
      open={open}
      title={copy.title(look.timesWorn)}
      onBack={onBack}
      testId="worn-view"
      footer={
        <button
          type="button"
          onClick={onAddDate}
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-pill border border-border-control font-sans text-ink text-sm ${focus}`}
        >
          {copy.add}
        </button>
      }
    >
      {query.isError ? (
        <ErrorText>{errorCopy(query.error)}</ErrorText>
      ) : query.isPending ? (
        <Skeleton shape="text" className="h-4 w-40" />
      ) : items.length === 0 ? (
        <p className="px-0 pt-7 pb-2 text-center font-display font-light text-[17px] text-ink-muted italic">
          {copy.none}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((wear) => {
            const diff = wearDiff(
              wear.pieces,
              look.pieces.map((p) => ({ id: p.piece.id })),
              labelOf,
            );
            const date = longDate(wear.wornOn);
            return (
              <li
                key={wear.id}
                className="flex h-[54px] items-center gap-3 rounded-input border-[0.5px] border-rule-mid bg-bg pr-1.5 pl-3.5"
              >
                <Link
                  href={`/plan/${wear.wornOn}`}
                  aria-label={wears.openDay(date)}
                  className={`flex min-w-0 flex-1 items-center gap-3 rounded-crisp ${focus}`}
                >
                  <span className="shrink-0 font-sans text-[13px] text-ink">
                    {weekdayDayMonth(wear.wornOn)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display font-light text-[15px] text-ink-muted italic">
                    {diff.differs ? wears.diff(diff.instead, diff.without) : wears.asSaved}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => remove.mutate({ params: { id: look.id, date: wear.wornOn } })}
                  aria-label={wears.remove(date)}
                  className={`flex h-11 w-9 shrink-0 items-center justify-center text-ink ${focus}`}
                >
                  <Icon name="close" size={17} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Subview>
  );
}
