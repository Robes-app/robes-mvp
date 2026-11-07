'use client';

import { Tabs } from '@robes/ui';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

type Tab = 'style' | 'account';

// Felix's underline Tabs (Style profile · Account) over the tab's drill card, 16px below. The tab
// rides in the URL so a row's page comes back to it. Native twin: features/you/YouMenu.tsx.
export function YouTabs({
  initial,
  style,
  account,
  labels,
}: {
  initial: Tab;
  style: ReactNode;
  account: ReactNode;
  labels: { label: string; style: string; account: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>(initial);
  const choose = (next: Tab) => {
    setTab(next);
    router.replace(next === 'account' ? `${pathname}?tab=account` : pathname, { scroll: false });
  };
  const current = tab === 'style' ? labels.style : labels.account;
  return (
    <div className="flex flex-col gap-4">
      <Tabs
        label={labels.label}
        items={[labels.style, labels.account]}
        value={current}
        onChange={(item) => choose(item === labels.account ? 'account' : 'style')}
      />
      <div role="tabpanel" aria-label={current}>
        {tab === 'style' ? style : account}
      </div>
    </div>
  );
}
