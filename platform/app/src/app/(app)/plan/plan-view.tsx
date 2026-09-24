'use client';

import { plan } from '@robes/copy';
import { SegmentedControl } from '@robes/ui';
import { useState } from 'react';
import { localToday } from '@/lib/dates';
import { PlanList } from './plan-list';
import { PlanMonth } from './plan-month';

type View = 'list' | 'month';

export function PlanView() {
  const [view, setView] = useState<View>('list');
  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl<View>
        label={plan.view.label}
        options={[
          { value: 'list', label: plan.view.list },
          { value: 'month', label: plan.view.month },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'list' ? <PlanList /> : <PlanMonth today={localToday()} />}
    </div>
  );
}
