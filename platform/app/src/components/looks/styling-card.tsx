'use client';

import { lookbook } from '@robes/copy';
import { SwitchPill } from '@robes/ui';
import { type ReactNode, useEffect, useState } from 'react';
import { SheetField } from './draft-sheets';

const copy = lookbook.draftLook;
const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const TURN_MS = 3200;

// The prompt row's placeholder turns through the suggestions while the field is empty.
export function useTurningPlaceholder(lines: readonly string[], on: boolean): string {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!on || lines.length < 2) return;
    const t = setInterval(() => setI((n) => n + 1), TURN_MS);
    return () => clearInterval(t);
  }, [on, lines.length]);
  return lines[i % lines.length] ?? '';
}

// The styling card (Front Door PRD rev 3 §4.6, §6.1): white on the fine rule, radius 12, no
// heading. The context row — the day's weather chip at the left, the Shop toggle at the right —
// then the thread's lines and the borderless 52px prompt row with its turning placeholder. The
// draft and the saved look share it; what the field sends is the parent's (Generate, Update
// look). Native twin: mobile/src/features/looks/StylingCard.tsx.
export function StylingCard({
  context,
  shop,
  onShop,
  thread,
  placeholder,
  placeholders,
  value,
  onChange,
  onSend,
  onDescribe,
  describeLabel,
  busy,
}: {
  context?: ReactNode;
  shop: boolean;
  onShop: (next: boolean) => void;
  thread?: ReactNode;
  // One placeholder (a saved look's "more casual…"), or the turning set of the draft.
  placeholder?: string;
  placeholders?: readonly string[];
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onDescribe?: () => void;
  describeLabel?: string;
  busy: boolean;
}) {
  const turning = useTurningPlaceholder(placeholders ?? [], value.length === 0 && !placeholder);
  const hint = placeholder ?? turning ?? copy.placeholder;
  return (
    <section
      aria-label={copy.thread}
      data-testid="styling-card"
      className="flex flex-col gap-1 rounded-card border-[0.5px] border-rule-mid bg-surface-raised px-3 pt-3 pb-1"
    >
      <div className="flex min-h-7 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1">{context}</div>
        <SwitchPill
          icon="bag"
          label={copy.shop.label}
          checked={shop}
          onChange={onShop}
          hintOn={copy.shop.on}
          hintOff={copy.shop.off}
          className="shrink-0"
        />
      </div>
      {thread}
      <div className="flex min-h-13 items-center">
        <SheetField
          label={placeholder ?? copy.placeholder}
          placeholder={hint}
          value={value}
          onChange={onChange}
          onSend={onSend}
          disabled={busy}
          autoFocus={false}
          className="py-3.5"
          testId="draft-prompt"
        />
      </div>
      {onDescribe ? (
        <button
          type="button"
          onClick={onDescribe}
          disabled={busy}
          className={`min-h-7 self-start pb-1 font-sans text-[11px] text-ink-muted underline underline-offset-4 hover:text-ink disabled:text-ink-faint ${focus}`}
        >
          {describeLabel}
        </button>
      ) : null}
    </section>
  );
}
