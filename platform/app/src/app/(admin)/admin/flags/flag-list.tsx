'use client';

import { useApiMutation } from '@robes/api-client/react';
import type { AdminFlag } from '@robes/contracts';
import { admin as copy } from '@robes/copy';
import { Switch, useToast } from '@robes/ui';
import { useState } from 'react';

export function FlagList({ initial }: { initial: AdminFlag[] }) {
  const [flags, setFlags] = useState(initial);
  const toast = useToast();
  const set = useApiMutation('admin.flags.set', {
    onSuccess: (flag) => {
      setFlags((all) => all.map((f) => (f.key === flag.key ? flag : f)));
      toast({ message: copy.flags.changed(flag.key, flag.enabled) });
    },
    onError: () => toast({ message: copy.flags.failed }),
  });
  return (
    <ul className="flex max-w-2xl flex-col divide-y divide-hairline">
      {flags.map((f) => (
        <li key={f.key} className="py-3">
          <Switch
            label={f.key}
            hint={f.description ?? undefined}
            checked={f.enabled}
            disabled={set.isPending}
            onChange={(enabled) => set.mutate({ params: { key: f.key }, input: { enabled } })}
          />
        </li>
      ))}
    </ul>
  );
}
