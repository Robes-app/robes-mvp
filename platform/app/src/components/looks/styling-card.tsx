'use client';

import { lookbook } from '@robes/copy';
import { ASK_MAX_CHARS, type DockState, type Source, type Sources } from '@robes/core/looks';
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
  onEmpty,
  boxed = false,
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
  // What a send does on an empty field. `blur`: the send stays ready, sends nothing and the field
  // lets go (D5). `minimise`: the same, and the dock folds to the sparkle (docked prompt K6), by
  // `onEmpty`. `send`: she tapped what to change, which stands for her words (F10). Unset: the send
  // waits for her words (L3).
  emptySend?: 'blur' | 'minimise' | 'send';
  onEmpty?: () => void;
  // Inline, in its own white box on the fine rule: the thread, so the row reads as one field
  // holding the sources, her tokens and the send (Annie, 18 Nov). On the bar the card is the box.
  boxed?: boolean;
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
    if (!words && (emptySend === 'blur' || emptySend === 'minimise')) {
      row.current?.querySelector('textarea')?.blur();
      if (emptySend === 'minimise') onEmpty?.();
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
        {...(inline ? {} : { label: copy.sources.wardrobe.tip })}
        testId="source-wardrobe"
      />
      <IconToggle
        icon="shop"
        tip={copy.sources.shop.tip}
        checked={sources.shop}
        onChange={() => onSource('shop')}
        labelOn={copy.sources.shop.on}
        labelOff={copy.sources.shop.off}
        {...(inline ? {} : { label: copy.sources.shop.tip })}
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
        className={
          boxed ? 'rounded-lg border border-rule-mid bg-surface-raised py-1.5 pr-1.5 pl-2' : 'pl-1'
        }
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
      className="flex flex-col gap-1 px-1.5 pt-1.5"
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

// The docked prompt (docked prompt PRD K1–K9; designs 1d, 2c): one white card at the look's foot,
// inset from its edges, in three states. `spark`: the round ink button alone, bottom right, with a
// dot while Robes' question waits (K3). `bar`: before her first send the box she types into (the
// labelled sources, the day, the field); after it the grabber, Robes' latest line with its thumbs,
// and the field (K4, K7). `thread`: the same card grown, with its title and close, the conversation
// scrolled to its latest line, and the field (K8); the parent dims the look behind it.
// Native twin: mobile/src/features/looks/StylingCard.tsx.
export function PromptDock({
  state,
  first,
  line,
  working,
  thumbs,
  answers,
  dot,
  expandable = true,
  beside = false,
  conversation,
  onRestore,
  onExpand,
  onCollapse,
  onMinimise,
  children,
}: {
  state: DockState;
  // Before her first send: the box alone, with no grabber and no line from Robes.
  first: boolean;
  // Robes' latest line on the bar: its question, the work in hand, or what it said.
  line: string | null;
  working: boolean;
  thumbs?: ReactNode;
  // After a thumbs down, what she can answer with (the reasons, Which piece?), under the line.
  answers?: ReactNode;
  // Robes' question waits unanswered (K3).
  dot: boolean;
  // The bar opens into a thread (its grabber); New look's bar, which has none yet, does not.
  expandable?: boolean;
  // The sparkle stands beside the saved look's ink button (design 2c): outlined on white, so the
  // button stays the screen's one ink fill, with no padding of its own.
  beside?: boolean;
  conversation?: ReactNode;
  // The sparkle back to the bar; the bar up to the thread; the thread down to the bar.
  onRestore: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  // The thread's close puts the prompt away, to the sparkle (Annie, 18 Nov).
  onMinimise?: () => void;
  children: ReactNode;
}) {
  if (state === 'spark') {
    const spark = (
      <button
        type="button"
        aria-label={dot ? `${copy.dock.open}. ${copy.dock.waiting}` : copy.dock.open}
        title={copy.dock.open}
        onClick={onRestore}
        data-testid="prompt-spark"
        className={`relative flex size-14 shrink-0 items-center justify-center rounded-pill ${
          beside ? 'border border-warm-line bg-surface-raised text-ink' : 'bg-ink text-bg'
        } ${lift} ${focus}`}
      >
        <Icon name="looks" size={20} />
        {dot ? (
          <span
            aria-hidden
            data-testid="prompt-spark-dot"
            className="absolute top-0.5 right-0.5 size-3 rounded-pill border-2 border-bg bg-accent-warm"
          />
        ) : null}
      </button>
    );
    return beside ? spark : <div className="flex justify-end px-3 pb-3.5">{spark}</div>;
  }
  const card = `mx-2.5 mb-2.5 flex flex-col rounded-[22px] bg-surface-raised ${lift}`;
  if (state === 'bar') {
    return (
      <section
        aria-label={copy.dock.title}
        data-testid="prompt-dock"
        data-state="bar"
        className={`${card} pb-2.5`}
      >
        {first ? null : (
          <>
            {expandable ? (
              <Grabber
                label={copy.dock.expand}
                onTap={onExpand}
                onUp={onExpand}
                testId="prompt-expand"
              />
            ) : (
              <div className="h-3" />
            )}
            {line ? (
              <div className="flex items-center gap-2.5 px-4 pt-1.5 pb-2">
                <RobesAvatar working={working} />
                <p
                  aria-live="polite"
                  data-testid="prompt-pill-line"
                  className="flex min-w-0 flex-1 items-center gap-2 truncate font-sans text-[15px] text-ink-muted"
                >
                  {working ? (
                    <Icon
                      name="refresh"
                      size={13}
                      className="shrink-0 motion-safe:animate-spin [animation-direction:reverse]"
                    />
                  ) : null}
                  <span className="truncate">{line}</span>
                </p>
                {thumbs}
              </div>
            ) : null}
            {answers ? <div className="flex flex-col gap-3 px-4 pb-2">{answers}</div> : null}
          </>
        )}
        <div className="px-2.5">{children}</div>
      </section>
    );
  }
  return (
    <section
      aria-label={copy.dock.title}
      data-testid="prompt-dock"
      data-state="thread"
      className={`${card} max-h-[78dvh] pb-2.5`}
    >
      <Grabber
        label={copy.dock.minimise}
        onTap={onCollapse}
        onDown={onCollapse}
        testId="prompt-grabber"
      />
      <div className="mx-4 flex shrink-0 items-center gap-3 border-rule-mid border-b pb-3">
        <span className="flex-1 font-medium font-sans text-[9px] text-ink-muted uppercase tracking-[0.22em]">
          {copy.dock.title}
        </span>
        <button
          type="button"
          aria-label={copy.dock.minimise}
          title={copy.dock.minimise}
          onClick={onMinimise ?? onCollapse}
          data-testid="prompt-minimise"
          className={`relative flex size-8 shrink-0 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted after:absolute after:-inset-1.5 after:content-[''] hover:text-ink ${focus}`}
        >
          <Icon name="down" size={14} />
        </button>
      </div>
      {conversation ? <Conversation>{conversation}</Conversation> : null}
      <div className="shrink-0 px-2.5 pt-1">{children}</div>
    </section>
  );
}

// The thread's turns, scrolled to the latest line when it opens (K8 "the thread scrolls to the
// latest line") and as lines arrive.
function Conversation({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  });
  return (
    // biome-ignore lint/a11y/useSemanticElements: a scrolling group of turns, not a fieldset
    <div
      ref={box}
      role="group"
      aria-label={copy.thread}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a region that scrolls needs a focus stop
      tabIndex={0}
      className={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pt-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${focus}`}
      data-testid="prompt-conversation"
    >
      {children}
    </div>
  );
}

// The card's top edge (K8): a tap moves it, and so does a swipe — up on the bar opens the thread,
// down on the thread folds it. A swipe never also counts as the tap.
const SWIPE_PX = 24;
function Grabber({
  label,
  onTap,
  onUp,
  onDown,
  testId,
}: {
  label: string;
  onTap: () => void;
  onUp?: () => void;
  onDown?: () => void;
  testId: string;
}) {
  const from = useRef<number | null>(null);
  const swiped = useRef(false);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(e) => {
        from.current = e.clientY;
        swiped.current = false;
      }}
      onPointerUp={(e) => {
        const dy = from.current === null ? 0 : e.clientY - from.current;
        from.current = null;
        if (dy <= -SWIPE_PX && onUp) {
          swiped.current = true;
          onUp();
        } else if (dy >= SWIPE_PX && onDown) {
          swiped.current = true;
          onDown();
        }
      }}
      onClick={() => {
        if (swiped.current) {
          swiped.current = false;
          return;
        }
        onTap();
      }}
      data-testid={testId}
      className={`flex h-6 w-full shrink-0 touch-none items-center justify-center rounded-t-[22px] ${focus}`}
    >
      <span aria-hidden className="h-1 w-9 rounded-pill bg-rule-mid" />
    </button>
  );
}
