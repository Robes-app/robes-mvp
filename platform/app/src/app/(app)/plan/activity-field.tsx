'use client';

import { queryKeys, useApiMutation } from '@robes/api-client/react';
import type { PlanEntry } from '@robes/contracts';
import { plan } from '@robes/copy';
import { useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { formatDay } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';

// Inline rename of what's on that day; saves when she leaves the field or presses Enter.
export function ActivityField({ entry }: { entry: PlanEntry }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(entry.activity ?? '');
  const update = useApiMutation('plan.update', {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.route('plan.get') }),
    onError: (err) => toast({ message: errorCopy(err) }),
  });
  const commit = () => {
    const next = value.trim() || null;
    if (next === (entry.activity ?? null)) return;
    update.mutate({ params: { id: entry.id }, input: { activity: next } });
  };
  return (
    <input
      aria-label={plan.activityLabel(formatDay(entry.date))}
      placeholder={plan.activityPlaceholder}
      value={value}
      maxLength={120}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className="min-h-11 w-full max-w-sm border-b border-border-control bg-transparent font-sans text-sm text-ink placeholder:text-ink-muted focus-visible:border-ink focus-visible:outline-none"
    />
  );
}
