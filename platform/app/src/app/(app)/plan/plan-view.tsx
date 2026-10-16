'use client';

import { plan } from '@robes/copy';
import { monthLabel, shiftMonth } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { SegmentedControl } from '@robes/ui';
import { useState } from 'react';
import { AddCircle } from '@/components/add-circle';
import { localToday } from '@/lib/dates';
import { LookPicker } from './look-picker';
import { PLAN_DAYS, PlanList } from './plan-list';
import { PlanMonth } from './plan-month';

type View = 'list' | 'month';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The Plan (legacy Diary) head is the shared anatomy (809b13e): the List | Month track and the +
// on row 1; row 2 is the eyebrow alone, with ‹ › at its right on Month.
export function PlanView() {
  const today = localToday();
  const [view, setView] = useState<View>('list');
  const [month, setMonth] = useState(today.slice(0, 7));
  const [picking, setPicking] = useState(false);
  return (
    <div className="flex flex-col gap-5 pt-2">
      <h1 className="sr-only">{plan.title}</h1>
      <div className="flex items-center justify-between gap-4">
        <SegmentedControl<View>
          label={plan.view.label}
          options={[
            { value: 'list', label: plan.view.list },
            { value: 'month', label: plan.view.month },
          ]}
          value={view}
          onChange={setView}
        />
        {/* The trip is hidden, so the + adds a look straight away (legacy 2eacfb4). */}
        <AddCircle label={plan.header.add} expanded={picking} onClick={() => setPicking(true)} />
      </div>
      <div className="flex h-8 items-center justify-between gap-3">
        <p className="font-sans text-[10px] tracking-[0.24em] text-ink-faint uppercase">
          {view === 'list' ? plan.header.window(PLAN_DAYS) : monthLabel(month)}
        </p>
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
      {view === 'list' ? <PlanList today={today} /> : <PlanMonth today={today} month={month} />}
      <LookPicker date={picking ? today : null} onClose={() => setPicking(false)} />
    </div>
  );
}

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
      className={`relative inline-flex size-8 items-center justify-center rounded-pill border border-hairline text-ink after:absolute after:-inset-1.5 hover:border-border-control ${focus}`}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}
