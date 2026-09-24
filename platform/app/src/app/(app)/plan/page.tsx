import { nav } from '@robes/copy';
import { Skeleton } from '@robes/ui';
import { Soon } from '@/components/soon';

const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

// Plan lands in M5; the week strip skeleton shows its shape.
export default function PlanPage() {
  return (
    <div className="flex flex-col gap-6">
      <Soon title={nav.plan} />
      <div aria-hidden className="grid grid-cols-7 gap-2">
        {WEEK.map((day) => (
          <Skeleton key={day} className="h-20" />
        ))}
      </div>
    </div>
  );
}
