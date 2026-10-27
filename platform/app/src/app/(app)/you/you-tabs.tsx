'use client';

import { SegmentedControl } from '@robes/ui';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

type Tab = 'style' | 'account';

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
  return (
    // The tab header (legacy .rb-seg2): centred, 260 wide on the web, the column's width on a phone.
    <div className="flex flex-col gap-[26px]">
      <SegmentedControl
        className="w-full self-center md:w-[260px]"
        label={labels.label}
        value={tab}
        options={[
          { value: 'style', label: labels.style },
          { value: 'account', label: labels.account },
        ]}
        onChange={choose}
      />
      <div>{tab === 'style' ? style : account}</div>
    </div>
  );
}
