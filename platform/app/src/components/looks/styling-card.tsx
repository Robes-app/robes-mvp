'use client';

import { lookbook } from '@robes/copy';
import { ASK_MAX_CHARS, type Source, type Sources } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { ErrorText, IconToggle } from '@robes/ui';
import { type ReactNode, useEffect, useRef, useState } from 'react';
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

// The prompt box (look prompt PRD P1–P8, S1, D1): white on the fine rule, radius 12, no heading.
// The top row holds the two sources — Wardrobe, then Shop — and, on a draft for a day, a hairline
// and the day's place and weather. Then the thread's lines, and the borderless prompt row with
// the round send inside it. The draft and the saved look share it; what a send does is the
// parent's (the brief, the thread, Update look). Native twin:
// mobile/src/features/looks/StylingCard.tsx.
export function StylingCard({
  context,
  sources,
  onSource,
  wardrobeEmpty,
  thread,
  placeholder,
  placeholders,
  value,
  onChange,
  onSend,
  emptySend,
  onDescribe,
  describeLabel,
  busy,
}: {
  context?: ReactNode;
  sources: Sources;
  onSource: (which: Source) => void;
  // She owns nothing: Wardrobe is drawn faded, and a tap on it says why (S3).
  wardrobeEmpty: boolean;
  thread?: ReactNode;
  // One placeholder (a saved look's "add matching shoes…"), or the turning set of the draft.
  placeholder?: string;
  placeholders?: readonly string[];
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  // What a send does on an empty field. `blur`: a draft's send stays ready, sends nothing and the
  // field lets go (D5). `send`: she tapped what to change, which stands for her words (F10).
  // Unset: a saved look's send waits for her words (L3).
  emptySend?: 'blur' | 'send';
  onDescribe?: () => void;
  describeLabel?: string;
  busy: boolean;
}) {
  const turning = useTurningPlaceholder(placeholders ?? [], value.length === 0 && !placeholder);
  const hint = placeholder ?? turning ?? copy.placeholder;
  const row = useRef<HTMLDivElement>(null);
  const words = value.trim();
  const tooLong = words.length > ASK_MAX_CHARS;
  const ready = !busy && !tooLong && (words.length > 0 || emptySend !== undefined);
  const send = () => {
    if (!ready) return;
    if (!words && emptySend === 'blur') {
      row.current?.querySelector('textarea')?.blur();
      return;
    }
    onSend();
  };
  return (
    <section
      aria-label={copy.thread}
      data-testid="styling-card"
      className="flex flex-col gap-1 rounded-card border-[0.5px] border-rule-mid bg-surface-raised px-3 pt-3 pb-1"
    >
      <div className="flex min-h-7 items-center gap-2.5">
        <IconToggle
          icon="wardrobe"
          tip={copy.sources.wardrobe.tip}
          checked={sources.wardrobe}
          onChange={() => onSource('wardrobe')}
          labelOn={copy.sources.wardrobe.on}
          labelOff={wardrobeEmpty ? copy.sources.wardrobe.empty : copy.sources.wardrobe.off}
          faded={wardrobeEmpty}
          testId="source-wardrobe"
        />
        <IconToggle
          icon="bag"
          tip={copy.sources.shop.tip}
          checked={sources.shop}
          onChange={() => onSource('shop')}
          labelOn={copy.sources.shop.on}
          labelOff={copy.sources.shop.off}
          testId="source-shop"
        />
        {context ? (
          <>
            <span aria-hidden className="h-4 w-px shrink-0 bg-rule-mid" />
            <div className="flex min-w-0 flex-1">{context}</div>
          </>
        ) : null}
      </div>
      {thread}
      <div ref={row} className="flex min-h-13 items-center gap-2">
        <SheetField
          label={placeholder ?? copy.placeholder}
          placeholder={hint}
          value={value}
          onChange={onChange}
          onSend={send}
          disabled={busy}
          autoFocus={false}
          hardLimit={false}
          className="py-3.5"
          testId="draft-prompt"
        />
        <button
          type="button"
          aria-label={copy.send}
          title={copy.send}
          aria-disabled={!ready}
          onClick={send}
          data-testid="prompt-send"
          className={`relative flex size-8 shrink-0 items-center justify-center rounded-pill bg-ink text-bg after:absolute after:-inset-1.5 after:content-[''] ${
            ready ? '' : 'cursor-default opacity-30'
          } ${focus}`}
        >
          <Icon name="send" size={14} />
        </button>
      </div>
      {tooLong ? (
        <ErrorText size="caption" className="pb-2" data-testid="prompt-too-long">
          {copy.tooLong(ASK_MAX_CHARS)}
        </ErrorText>
      ) : null}
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
