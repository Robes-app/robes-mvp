'use client';

import { lookbook } from '@robes/copy';
import { BALANCES, type Balance } from '@robes/core/looks';
import { Pill, Text } from '@robes/ui';

const copy = lookbook.prompt.balance;

// The one question on a new look (legacy 2026-10-19): where its pieces come from. A chip answers
// it; her own words in the field answer it too.
export function BalanceQuestion({
  echo,
  onPick,
  disabled,
}: {
  // Her ask, held while she answers.
  echo?: string;
  onPick: (b: Balance) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2" data-testid="balance-question">
      {echo ? (
        <Text size="small" tone="muted" italic>
          {echo}
        </Text>
      ) : null}
      <Text className="font-display text-lg">{copy.question}</Text>
      <div className="flex flex-wrap gap-2">
        {BALANCES.map((b) => (
          <Pill key={b} disabled={disabled} onClick={() => onPick(b)}>
            {copy[b]}
          </Pill>
        ))}
      </div>
    </div>
  );
}
