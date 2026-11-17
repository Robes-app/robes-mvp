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
// Every box turns on one clock (look prompt improvements B8, 16 Nov): the resting box and the
// open sheet's box show the same line, so opening the prompt never jumps back to the first.
const turnNow = () => Math.floor(Date.now() / TURN_MS);
export function useTurningPlaceholder(lines: readonly string[], on: boolean): string {
  const [turn, setTurn] = useState(turnNow);
  useEffect(() => {
    if (!on || lines.length < 2) return;
    setTurn(turnNow());
    // Wakes on the clock's next turn, then on each one after it.
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(
        () => {
          setTurn(turnNow());
          next();
        },
        TURN_MS - (Date.now() % TURN_MS),
      );
    };
    next();
    return () => clearTimeout(t);
  }, [on, lines.length]);
  return lines[turn % lines.length] ?? '';
}

// The white of the prompt box and of its closed bar lifts off the look on a soft ink shadow.
const lift = 'shadow-[0_16px_34px_-14px_color-mix(in_srgb,var(--color-ink)_42%,transparent)]';

// The prompt box (look prompt PRD P1–P8, S1, D1; redline 14 Nov pins 1, 5, 8, 9, 11): white on
// the fine rule and nothing but the sources and the field. Before there is a conversation it
// floats on its own, radius 14, the sources over the field with the day's place and weather
// beside them. `inline`, under a conversation, it is one 50px row at radius 8: the sources, what
// she picked as tokens, the field and the send. The conversation itself is never inside it. The
// draft and the saved look share it; what a send does is the parent's. Native twin:
// mobile/src/features/looks/StylingCard.tsx.
export function StylingCard({
  context,
  tokens,
  inline = false,
  sources,
  onSource,
  wardrobeEmpty,
  placeholder,
  placeholders,
  value,
  onChange,
  onSend,
  emptySend,
  busy,
}: {
  // The day's place and weather, until her first send carries them into the conversation.
  context?: ReactNode;
  // What she picked after a thumbs down, standing in the box beside the sources (pin 11).
  tokens?: ReactNode;
  inline?: boolean;
  sources: Sources;
  onSource: (which: Source) => void;
  // She owns nothing: Wardrobe is drawn faded, and a tap on it says why (S3).
  wardrobeEmpty: boolean;
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
  const toggles = (
    <div className="flex shrink-0 items-center gap-2">
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
        icon="shop"
        tip={copy.sources.shop.tip}
        checked={sources.shop}
        onChange={() => onSource('shop')}
        labelOn={copy.sources.shop.on}
        labelOff={copy.sources.shop.off}
        testId="source-shop"
      />
    </div>
  );
  const field = (
    <SheetField
      label={placeholder ?? copy.placeholder}
      placeholder={hint}
      value={value}
      onChange={onChange}
      onSend={send}
      disabled={busy}
      autoFocus={false}
      hardLimit={false}
      faintHint
      className={inline ? 'min-w-28 py-2' : 'py-3.5'}
      testId="draft-prompt"
    />
  );
  // The send is the sparkle on ink (pin 8); at rest the same, at 35%.
  const sendButton = (
    <button
      type="button"
      aria-label={copy.send}
      title={copy.send}
      aria-disabled={!ready}
      onClick={send}
      data-testid="prompt-send"
      className={`relative flex size-8 shrink-0 items-center justify-center rounded-pill bg-ink text-bg after:absolute after:-inset-1.5 after:content-[''] ${
        ready ? '' : 'cursor-default opacity-35'
      } ${focus}`}
    >
      <Icon name="looks" size={16} />
    </button>
  );
  const over = tooLong ? (
    <ErrorText size="caption" className="w-full pb-2" data-testid="prompt-too-long">
      {copy.tooLong(ASK_MAX_CHARS)}
    </ErrorText>
  ) : null;
  if (inline) {
    return (
      <section
        aria-label={copy.thread}
        data-testid="styling-card"
        className="rounded-lg border border-rule-mid bg-surface-raised py-1.5 pr-1.5 pl-2"
      >
        <div ref={row} className="flex min-h-[38px] flex-wrap items-center gap-2">
          {toggles}
          {tokens}
          {field}
          {sendButton}
        </div>
        {over}
      </section>
    );
  }
  return (
    <section
      aria-label={copy.thread}
      data-testid="styling-card"
      className={`flex flex-col gap-1 rounded-[14px] border border-rule-mid bg-surface-raised px-3 pt-3 pb-1 ${lift}`}
    >
      <div className="flex min-h-7 flex-wrap items-center gap-2.5">
        {toggles}
        {context ? (
          <>
            <span aria-hidden className="h-4 w-px shrink-0 bg-rule-mid" />
            <div className="flex min-w-0 flex-1">{context}</div>
          </>
        ) : null}
        {tokens}
      </div>
      <div ref={row} className="flex min-h-13 items-center gap-2">
        {field}
        {sendButton}
      </div>
      {over}
    </section>
  );
}

// Robes in the conversation and on the closed bar (pin 18): the sparkle, cream on a 26px ink disc.
export function RobesAvatar({ working = false }: { working?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-[26px] shrink-0 items-center justify-center rounded-pill bg-ink text-bg ${working ? 'motion-safe:animate-pulse' : ''}`}
    >
      <Icon name="looks" size={13} />
    </span>
  );
}

// Where the prompt stands (look prompt PRD F23; redline 14 Nov pins 1, 10, 15–21, 23): floating
// at the foot of the look, never on a band of its own. `open` with a conversation is a cream
// sheet — the tracked title and the minimise disc, the turns scrolling newest-last, and the box
// under them, to at most two thirds of the screen; with none it is the box alone. `pill` is the
// closed bar: Robes' avatar, the line it was on, the thumbs while Robes is asking, and the disc
// that opens it. `spark` is the sparkle that opens it again (a saved look at rest, a draft after
// a thumbs up). Native twin: mobile/src/features/looks/StylingCard.tsx.
export type DockState = 'open' | 'pill' | 'spark';

export function PromptDock({
  state,
  sheet,
  line,
  working,
  thumbs,
  conversation,
  onOpen,
  onMinimise,
  children,
}: {
  state: DockState;
  // There is a conversation to show, or a saved look's prompt was opened: the sheet stands.
  sheet: boolean;
  // What the closed bar says: Robes' open question, the work in hand, or the invitation.
  line: string;
  working: boolean;
  thumbs?: ReactNode;
  conversation?: ReactNode;
  onOpen: () => void;
  onMinimise: () => void;
  children: ReactNode;
}) {
  if (state === 'spark') {
    return (
      <div className="flex justify-end px-3 pb-3.5">
        <button
          type="button"
          aria-label={copy.dock.open}
          title={copy.dock.open}
          onClick={onOpen}
          data-testid="prompt-spark"
          className={`flex size-11 shrink-0 items-center justify-center rounded-pill bg-ink text-bg ${lift} ${focus}`}
        >
          <Icon name="looks" size={18} />
        </button>
      </div>
    );
  }
  if (state === 'pill') {
    return (
      <div className="px-3 pb-3.5">
        <div
          data-testid="prompt-pill"
          className="flex min-h-11 items-center gap-2.5 rounded-pill border-[0.5px] border-rule-mid bg-surface-raised p-1.5 shadow-[0_12px_26px_-12px_color-mix(in_srgb,var(--color-ink)_40%,transparent)]"
        >
          <RobesAvatar working={working} />
          <button
            type="button"
            aria-expanded={false}
            onClick={onOpen}
            data-testid="prompt-pill-line"
            className={`min-h-8 min-w-0 flex-1 truncate text-left font-light font-sans text-[13px] text-ink-muted ${focus}`}
          >
            {line}
          </button>
          {thumbs}
          <button
            type="button"
            aria-label={copy.dock.expand}
            title={copy.dock.expand}
            onClick={onOpen}
            data-testid="prompt-expand"
            className={`relative flex size-8 shrink-0 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted after:absolute after:-inset-1.5 after:content-[''] hover:text-ink ${focus}`}
          >
            <Icon name="down" size={14} className="rotate-180" />
          </button>
        </div>
      </div>
    );
  }
  if (!sheet) {
    return (
      <div className="p-2.5" data-testid="prompt-dock">
        {children}
      </div>
    );
  }
  return (
    <section
      aria-label={copy.dock.title}
      data-testid="prompt-dock"
      className="flex max-h-[66dvh] flex-col rounded-t-[18px] bg-bg shadow-[0_-14px_30px_-18px_color-mix(in_srgb,var(--color-ink)_45%,transparent)]"
    >
      <div className="flex shrink-0 items-center gap-3 px-5 pt-3">
        <span className="flex-1 font-medium font-sans text-[9px] text-ink-muted uppercase tracking-[0.22em]">
          {copy.dock.title}
        </span>
        <button
          type="button"
          aria-label={copy.dock.minimise}
          title={copy.dock.minimise}
          onClick={onMinimise}
          data-testid="prompt-minimise"
          className={`relative flex size-8 shrink-0 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted after:absolute after:-inset-1.5 after:content-[''] hover:text-ink ${focus}`}
        >
          <Icon name="down" size={14} />
        </button>
      </div>
      {conversation ? (
        // biome-ignore lint/a11y/useSemanticElements: a scrolling group of turns, not a fieldset
        <div
          role="group"
          aria-label={copy.thread}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a region that scrolls needs a focus stop
          tabIndex={0}
          className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 pt-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${focus}`}
          data-testid="prompt-conversation"
        >
          {conversation}
        </div>
      ) : null}
      <div className="shrink-0 p-2.5">{children}</div>
    </section>
  );
}
