'use client';

import { lookbook as copy } from '@robes/copy';
import { ASK_MAX_CHARS, type ThreadLine } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { IconButton, Text } from '@robes/ui';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import type { Adjust } from '@/lib/adjust';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const d = copy.draft;

// The breathing sparkle that heads a work line (Robes at work).
function Sparkle({ working = false }: { working?: boolean }) {
  return (
    <Icon
      name="looks"
      size={14}
      className={`shrink-0 ${working ? 'motion-safe:animate-pulse text-accent-inspire' : 'text-ink'}`}
    />
  );
}

// The thread's lines (design 3b): hers right-aligned in the sans, Robes' in the serif, work with
// the sparkle, a filed rule as a caption. Shared by home's box and the look's card.
export function ThreadLines({
  thread,
  testId,
}: {
  thread: readonly ThreadLine[];
  testId?: string;
}) {
  const end = useRef<HTMLDivElement>(null);
  const n = thread.length;
  // Scrolls when a line lands. A block body: scrollIntoView returns a promise in newer Chromium,
  // and an effect that returned it handed React a cleanup that was not a function.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scrolls when a line lands
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [n]);
  if (n === 0) return null;
  return (
    <section
      className="flex max-h-64 flex-col gap-3 overflow-y-auto px-1.5 focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      aria-live="polite"
      aria-label={copy.draftLook.thread}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a region that scrolls needs a focus stop
      tabIndex={0}
      data-testid={testId ?? 'adjust-thread'}
    >
      {thread.map((line) =>
        line.who === 'her' ? (
          <Text key={line.id} size="small" tone="muted" className="self-end pl-6 text-right">
            {line.text}
          </Text>
        ) : line.who === 'robes' ? (
          <Text key={line.id} className="font-display text-[17px] leading-snug">
            {line.text}
          </Text>
        ) : line.who === 'work' ? (
          <Text
            key={line.id}
            size="small"
            tone="muted"
            italic
            role="status"
            className="flex items-center gap-2"
          >
            <Sparkle working />
            {line.text}
          </Text>
        ) : (
          <Text key={line.id} size="caption" tone="muted">
            {line.text}
          </Text>
        ),
      )}
      <div ref={end} />
    </section>
  );
}

const pill =
  'inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 font-sans text-[11px]';

// The options under the thread (design 3b): ↻ Dress it again — ink "Update the model · N" while
// changes are pending — then, on home, ✎ Adjust and View draft ›.
export function AdjustOptions({
  adjust,
  onAdjust,
  adjustOpen = false,
  onView,
}: {
  adjust: Pick<Adjust, 'stale' | 'badge' | 'busy' | 'canRedress' | 'redress' | 'state'>;
  onAdjust?: () => void;
  adjustOpen?: boolean;
  onView?: () => void;
}) {
  if (adjust.busy || adjust.state.asking) return null;
  const redress = adjust.stale || adjust.canRedress;
  if (!redress && !onAdjust && !onView) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1.5" data-testid="adjust-options">
      {redress ? (
        <button
          type="button"
          onClick={adjust.redress}
          className={`${pill} ${adjust.stale ? 'border-ink bg-ink text-bg' : 'border-rule-mid bg-surface-raised text-ink'} ${focus}`}
        >
          <Icon name="undo" size={11} className="-scale-x-100" />
          {adjust.stale ? d.updateModel(adjust.badge) : d.redress}
        </button>
      ) : null}
      {onAdjust ? (
        <button
          type="button"
          onClick={onAdjust}
          aria-expanded={adjustOpen}
          className={`${pill} ${adjustOpen ? 'border-selected-line bg-selected' : 'border-rule-mid bg-surface-raised'} text-ink ${focus}`}
        >
          <Icon name="pencil" size={11} />
          {d.adjustOpt}
        </button>
      ) : null}
      {onView ? (
        <button
          type="button"
          onClick={onView}
          className={`${pill} border-rule-mid bg-surface-raised text-ink ${focus}`}
        >
          {d.view}
          <Icon name="forward" size={11} />
        </button>
      ) : null}
    </div>
  );
}

// The input row: the sparkle, her words in the serif, → once there is text.
export function AdjustField({
  placeholder,
  disabled = false,
  onSend,
  autoFocus = false,
  testId = 'adjust-field',
}: {
  placeholder: string;
  disabled?: boolean;
  onSend: (words: string) => void;
  autoFocus?: boolean;
  testId?: string;
}) {
  const id = useId();
  const [text, setText] = useState('');
  const send = () => {
    const words = text.trim();
    if (!words) return;
    onSend(words);
    setText('');
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  return (
    <div className="flex items-center gap-2.5 pl-2">
      <Sparkle />
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <textarea
        id={id}
        rows={1}
        value={text}
        maxLength={ASK_MAX_CHARS}
        placeholder={placeholder}
        disabled={disabled}
        // biome-ignore lint/a11y/noAutofocus: the card opened for her words
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        data-testid={testId}
        className="max-h-24 min-h-10 flex-1 resize-none bg-transparent py-2 font-display text-[17px] font-light italic text-ink placeholder:text-ink-faint focus:outline-none"
      />
      <button
        type="button"
        aria-label={copy.prompt.send}
        onClick={send}
        disabled={disabled || !text.trim()}
        className={`flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface-sunk text-ink disabled:opacity-45 ${focus}`}
      >
        <Icon name="forward" size={15} />
      </button>
    </div>
  );
}

// The dock on a look's page (design 3b): a floating pill "Adjust this look…" with the pending
// count, which opens to the card — the thread, its options and the field. Sits in the page's
// footer, above Discard · Save. The native twin is mobile/src/features/looks/AdjustDock.tsx.
export function AdjustDock({
  adjust,
  name,
  disabled = false,
}: {
  adjust: Adjust;
  name: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = copy.prompt.label(name);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        data-testid="adjust-pill"
        className={`flex h-12 w-full items-center gap-2.5 rounded-pill bg-surface-raised pr-1.5 pl-4 text-left shadow-[0_18px_40px_-14px_color-mix(in_srgb,var(--color-ink)_38%,transparent)] ${focus}`}
      >
        <Sparkle />
        <span className="min-w-0 flex-1 truncate font-display text-[17px] font-light italic text-ink-muted">
          {adjust.placeholder}
        </span>
        <span className="flex size-9 items-center justify-center rounded-pill bg-surface-sunk text-ink">
          <Icon name="forward" size={15} />
        </span>
      </button>
    );
  }
  return (
    <section
      aria-label={label}
      data-testid="adjust-card"
      className="relative flex flex-col gap-3 rounded-sheet border border-rule-mid bg-surface-raised px-1.5 pt-3 pb-1.5 shadow-[0_18px_40px_-14px_color-mix(in_srgb,var(--color-ink)_38%,transparent)]"
    >
      <IconButton
        icon="close"
        label={copy.prompt.fold}
        onClick={() => setOpen(false)}
        className="absolute top-1 right-1 size-9"
      />
      <ThreadLines thread={adjust.state.thread} />
      <AdjustOptions adjust={adjust} />
      <AdjustField
        placeholder={adjust.placeholder}
        disabled={disabled || adjust.busy}
        onSend={adjust.send}
        autoFocus
      />
    </section>
  );
}
