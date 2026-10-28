'use client';

import { plan } from '@robes/copy';
import { monthLabel, shiftMonth } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { Eyebrow, IconButton, SegmentedControl } from '@robes/ui';
import { useState } from 'react';
import { localToday } from '@/lib/dates';
import { LookPicker } from './look-picker';
import { PLAN_DAYS, PlanList } from './plan-list';
import { PlanMonth } from './plan-month';
import { type PlanViewKind, usePlanView } from './use-plan-view';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The Diary tab (beta parity canvas, 04 Diary; the native twin is mobile/src/features/plan/
// PlanView.tsx): the List | Month track and the framed + pinned under the header; the eyebrow
// names the window, or the month with its ‹ › on Month.
export function PlanView() {
  const today = localToday();
  const [stored, setView] = usePlanView();
  const view = stored ?? 'list';
  const [month, setMonth] = useState(today.slice(0, 7));
  const [picking, setPicking] = useState(false);
  return (
    <div className="flex flex-col">
      <h1 className="sr-only">{plan.title}</h1>
      <div className="sticky top-11 z-30 -mx-5 flex items-center justify-between gap-4 bg-bg px-5 py-1 md:top-16 md:-mx-4 md:px-4">
        <SegmentedControl<PlanViewKind>
          label={plan.view.label}
          options={[
            { value: 'list', label: plan.view.list },
            { value: 'month', label: plan.view.month },
          ]}
          value={view}
          onChange={setView}
        />
        {/* The trip is hidden, so the + adds a look straight away (legacy 2eacfb4). */}
        <IconButton
          framed
          icon="plus"
          label={plan.header.add}
          aria-expanded={picking}
          onClick={() => setPicking(true)}
        />
      </div>
      <div className="mt-[22px] mb-3 flex min-h-8 items-center justify-between gap-3">
        <Eyebrow>{view === 'list' ? plan.header.window(PLAN_DAYS) : monthLabel(month)}</Eyebrow>
        {view === 'month' ? (
          <div className="flex items-center gap-2">
            <MonthArrow
              label={plan.prevMonth}
              icon="back"
              onClick={() => setMonth(shiftMonth(month, -1))}
            />
            <MonthArrow
              label={plan.nextMonth}
              icon="forward"
              onClick={() => setMonth(shiftMonth(month, 1))}
            />
          </div>
        ) : null}
      </div>
      {stored === null ? null : view === 'list' ? (
        <PlanList today={today} />
      ) : (
        <PlanMonth today={today} month={month} />
      )}
      <LookPicker date={picking ? today : null} onClose={() => setPicking(false)} />
    </div>
  );
}

// The month's ‹ ›: small white circles on the fine edge (the label is the cue).
function MonthArrow({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: 'back' | 'forward';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative inline-flex size-8 items-center justify-center rounded-pill border border-rule-mid bg-surface-raised text-ink after:absolute after:-inset-1.5 hover:border-border-control ${focus}`}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}
