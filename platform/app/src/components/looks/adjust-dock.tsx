'use client';

import type { PieceImage as PieceImageData } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { ASK_MAX_CHARS, openReasons, type ThreadLine } from '@robes/core/looks';
import { Icon, type IconName } from '@robes/icons/web';
import { IconButton, Text } from '@robes/ui';
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { PieceImage } from '@/components/wardrobe/piece-image';
import type { Adjust } from '@/lib/adjust';
import { RobesAvatar } from './styling-card';

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

// The conversation's lines (redline 14 Nov, pins 6 and 7): Robes speaks in the small sans beside
// its sparkle; she speaks in the italic serif, in a sunk bubble on the right. Under her first
// line, the place and weather her brief went with. A work line is Robes' with the sparkle
// breathing; a filed rule is a caption. `compact` (the prompt's sheet) leaves the scrolling to
// the sheet. Shared by the look's page and the prompt's sheet. Native twin: AdjustDock.tsx.
export function ThreadLines({
  thread,
  compact = false,
  meta,
  testId,
}: {
  thread: readonly ThreadLine[];
  compact?: boolean;
  meta?: ReactNode;
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
  const first = thread.find((l) => l.who === 'her')?.id;
  return (
    <section
      className={`flex flex-col gap-3 ${compact ? '' : 'max-h-64 overflow-y-auto px-1.5'} focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring`}
      aria-live="polite"
      aria-label={copy.draftLook.thread}
      {...(compact ? {} : { tabIndex: 0 })}
      data-testid={testId ?? 'adjust-thread'}
    >
      {thread.map((line) =>
        line.who === 'her' ? (
          <div key={line.id} className="flex flex-col items-end gap-1 self-end pl-8">
            <p
              data-testid="her-line"
              className="rounded-[16px_16px_4px_16px] bg-surface-sunk px-3.5 py-[9px] font-display font-light text-[16px] text-ink italic leading-[21px]"
            >
              {line.text}
            </p>
            {meta && line.id === first ? meta : null}
          </div>
        ) : line.who === 'robes' || line.who === 'work' ? (
          <div
            key={line.id}
            className="flex items-start gap-2.5"
            {...(line.who === 'work' ? { role: 'status' } : {})}
          >
            <RobesAvatar working={line.who === 'work'} />
            <p className={robesLine}>{line.text}</p>
          </div>
        ) : (
          <Text key={line.id} size="caption" tone="muted" className="pl-9">
            {line.text}
          </Text>
        ),
      )}
      <div ref={end} />
    </section>
  );
}

// Robes' voice on the page: Inter 300 at 13 on 19, ink-soft, level with its avatar.
const robesLine =
  'min-w-0 flex-1 pt-[3.5px] font-light font-sans text-[13px] text-ink-muted leading-[19px]';

const fb = copy.draftLook.feedback;
const chip =
  "relative inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-pill border px-[11px] font-light font-sans text-[12px] after:absolute after:inset-x-0 after:-inset-y-2 after:content-['']";
const chipOff = `${chip} border-warm-line bg-surface-raised text-ink-muted hover:text-ink`;
// A token in the prompt box (pin 11): what she picked, on the sunk cream inside the umber ring.
const token =
  "relative inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-pill border border-token-line bg-surface-sunk pr-1.5 pl-[9px] font-light font-sans text-[11px] text-ink after:absolute after:inset-x-0 after:-inset-y-2 after:content-['']";

function Thumb({
  icon,
  label,
  verdict,
  mine,
  onPress,
  testId,
}: {
  icon: IconName;
  label: string;
  // The open question's answer so far, and whether this thumb is it.
  verdict: 'ask' | 'up' | 'down';
  mine: boolean;
  onPress: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={mine}
      aria-disabled={verdict !== 'ask'}
      onClick={onPress}
      data-testid={testId}
      className={`relative flex size-[30px] shrink-0 items-center justify-center rounded-pill border after:absolute after:-inset-[7px] after:content-[''] ${
        mine
          ? 'border-token-line bg-surface-sunk text-ink'
          : 'border-warm-line bg-surface-raised text-ink-muted'
      } ${verdict !== 'ask' && !mine ? 'opacity-35' : ''} ${verdict === 'ask' ? '' : 'cursor-default'} ${focus}`}
    >
      <Icon name={icon} size={14} />
    </button>
  );
}

// The two thumbs that answer Robes' question (pins 14, 20): beside the question in the sheet and
// on the closed bar alike.
export function Thumbs({ adjust }: { adjust: Pick<Adjust, 'state' | 'thumb'> }) {
  const { verdict } = adjust.state;
  if (!verdict) return null;
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <Thumb
        icon="thumbsUp"
        label={fb.up}
        verdict={verdict}
        mine={verdict === 'up'}
        onPress={() => adjust.thumb('up')}
        testId="thumb-up"
      />
      <Thumb
        icon="thumbsDown"
        label={fb.down}
        verdict={verdict}
        mine={verdict === 'down'}
        onPress={() => adjust.thumb('down')}
        testId="thumb-down"
      />
    </div>
  );
}

// Robes' one question about the look as it stands (look prompt PRD F3–F8): two thumbs answer it;
// after a thumbs down, what to change — up to three reasons, or Restyle it all alone on a draft
// Robes made. A reason she picks leaves this list for the prompt box (FeedbackTokens). A thumbs
// up ends it there. Native twin: mobile/src/features/looks/AdjustDock.tsx.
export function Feedback({
  adjust,
  weather,
  canRestyle,
  pieces,
}: {
  adjust: Pick<Adjust, 'state' | 'thumb' | 'reason' | 'restyleAll' | 'piece'>;
  // The look carries a weather (a draft for a day, its chip standing): F14.
  weather: boolean;
  canRestyle: boolean;
  // The look's pieces, for Which piece? (docked prompt PRD Q6).
  pieces: readonly WhichPiece[];
}) {
  const { question, verdict } = adjust.state;
  if (!question || !verdict) return null;
  return (
    <div className="flex flex-col gap-3" data-testid="look-feedback">
      <div className="flex items-start gap-2.5">
        <RobesAvatar />
        <p role="status" className={robesLine}>
          {question}
        </p>
        <Thumbs adjust={adjust} />
      </div>
      {verdict === 'down' ? (
        <>
          <div className="flex items-start gap-2.5">
            <RobesAvatar />
            <p id="feedback-change" className={robesLine}>
              {fb.change}
            </p>
          </div>
          <Answers adjust={adjust} weather={weather} canRestyle={canRestyle} pieces={pieces} />
        </>
      ) : null}
    </div>
  );
}

// What she can answer a thumbs down with (F8, Q6): the reasons not yet picked, Restyle it all
// set apart, and Which piece? with the look's pieces while she is choosing one. In the thread
// under "What should change?", and on the bar under the same line, so folding the thread never
// hides them. Native twin: mobile/src/features/looks/AdjustDock.tsx Answers.
export function Answers({
  adjust,
  weather,
  canRestyle,
  pieces,
}: {
  adjust: Pick<Adjust, 'state' | 'reason' | 'restyleAll' | 'piece'>;
  weather: boolean;
  canRestyle: boolean;
  pieces: readonly WhichPiece[];
}) {
  const { verdict, restyle, choosingPiece } = adjust.state;
  if (verdict !== 'down') return null;
  const open = openReasons(adjust.state, { weather });
  return (
    <>
      {open.length > 0 || (canRestyle && !restyle) ? (
        // biome-ignore lint/a11y/useSemanticElements: a group of toggles, not a form fieldset
        <div
          role="group"
          aria-labelledby="feedback-change"
          className="flex flex-wrap gap-1.5 pl-9"
          data-testid="feedback-reasons"
        >
          {open.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={false}
              onClick={() => adjust.reason(r)}
              data-testid={`reason-${r}`}
              className={`${chipOff} ${focus}`}
            >
              {fb.reasons[r].label}
            </button>
          ))}
          {canRestyle && !restyle ? (
            <button
              type="button"
              aria-pressed={false}
              onClick={adjust.restyleAll}
              data-testid="reason-restyle"
              className={`${chip} border-transparent bg-surface-sunk text-ink-muted hover:text-ink ${focus}`}
            >
              <Icon name="refresh" size={11} />
              {fb.restyle.label}
            </button>
          ) : null}
        </div>
      ) : null}
      {choosingPiece ? <PieceChoice pieces={pieces} onPick={adjust.piece} /> : null}
    </>
  );
}

export interface WhichPiece {
  key: string;
  name: string;
  image: PieceImageData | null;
}

// Which piece? (docked prompt PRD Q6): one chip per piece in the look, its photograph only, the
// piece's name its label; a click drops "Not the {piece}" into the field. Native twin:
// mobile/src/features/looks/AdjustDock.tsx PieceChoice.
function PieceChoice({
  pieces,
  onPick,
}: {
  pieces: readonly WhichPiece[];
  onPick: (key: string) => void;
}) {
  return (
    <>
      <div className="flex items-start gap-2.5">
        <RobesAvatar />
        <p id="which-piece-q" role="status" className={robesLine}>
          {fb.whichPiece}
        </p>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a group of choices, not a form fieldset */}
      <div
        role="group"
        aria-labelledby="which-piece-q"
        className="flex flex-wrap gap-1.5 pl-9"
        data-testid="which-piece"
      >
        {pieces.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-label={p.name}
            onClick={() => onPick(p.key)}
            data-testid={`which-piece-${p.key}`}
            className={`w-14 overflow-hidden rounded-xl border border-warm-line bg-surface-raised ${focus}`}
          >
            <PieceImage piece={{ label: p.name, image: p.image }} sizes="56px" />
          </button>
        ))}
      </div>
    </>
  );
}

// What she picked after a thumbs down, standing in the prompt box beside the sources (pin 11):
// a tap on one takes it out again.
export function FeedbackTokens({
  adjust,
}: {
  adjust: Pick<Adjust, 'state' | 'reason' | 'restyleAll' | 'pieceToken'>;
}) {
  const { reasons, restyle } = adjust.state;
  const label = (r: (typeof reasons)[number]) =>
    r === 'piece' && adjust.pieceToken ? adjust.pieceToken : fb.reasons[r].label;
  if (reasons.length === 0 && !restyle) return null;
  return (
    <>
      {reasons.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed
          aria-label={fb.remove(label(r))}
          onClick={() => adjust.reason(r)}
          data-testid={`reason-${r}`}
          className={`${token} ${focus}`}
        >
          {label(r)}
          <Icon name="close" size={10} />
        </button>
      ))}
      {restyle ? (
        <button
          type="button"
          aria-pressed
          aria-label={fb.remove(fb.restyle.label)}
          onClick={adjust.restyleAll}
          data-testid="reason-restyle"
          className={`${token} ${focus}`}
        >
          <Icon name="refresh" size={11} />
          {fb.restyle.label}
          <Icon name="close" size={10} />
        </button>
      ) : null}
    </>
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
