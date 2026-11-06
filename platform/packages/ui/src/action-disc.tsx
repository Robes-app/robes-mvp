'use client';

import { Icon, type IconName } from '@robes/icons/web';
import { type ReactNode, useId } from 'react';
import { cn, focusRing } from './cn';

interface Base {
  icon: IconName;
  // One word, authored in sentence case ("Capture"); the style sets it in capitals.
  label: string;
  // What a reader hears when the word alone doesn't say it ("Capture a look for today").
  ariaLabel?: string;
  disabled?: boolean;
  testId?: string;
}

// A button, or (`onFile`) a photo picker: a label over a hidden file input, so the camera opens
// from the disc itself.
export type ActionDiscProps = Base &
  (
    | { onClick: () => void; onFile?: never }
    | {
        onFile: (file: File) => void;
        accept: string;
        capture?: 'environment' | 'user';
        onClick?: never;
      }
  );

const face =
  'flex size-14 items-center justify-center rounded-pill bg-surface-sunk text-ink-muted shadow-disc motion-safe:transition-opacity motion-safe:duration-150 group-hover:opacity-90';
const word = 'type-label tracking-[0.16em] text-ink-muted';

// Felix's ActionDisc: a 56px `surface-sunk` disc on the disc shadow with a 19px `ink-soft` glyph,
// its one-word label beneath in the label caps at 0.16em. The way into a look (Capture · Describe ·
// Pick) or onto it (Swap · Edit); never a primary commit. Twin of ui-native ActionDisc.tsx.
export function ActionDisc(props: ActionDiscProps) {
  const { icon, label, ariaLabel, disabled = false, testId } = props;
  const inputId = useId();
  const body = (
    <>
      <span className={face}>
        <Icon name={icon} size={19} />
      </span>
      <span className={word}>{label}</span>
    </>
  );
  const shell = cn(
    'group flex flex-col items-center gap-2 rounded-pill',
    disabled && 'pointer-events-none opacity-40',
  );
  if (props.onFile) {
    const { onFile, accept, capture } = props;
    return (
      <label
        htmlFor={inputId}
        data-testid={testId}
        className={cn(
          shell,
          'cursor-pointer focus-within:[&>span:first-child]:outline-[1.5px] focus-within:[&>span:first-child]:outline-offset-2 focus-within:[&>span:first-child]:outline-focus-ring',
        )}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          {...(capture ? { capture } : {})}
          aria-label={ariaLabel ?? label}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onFile(file);
          }}
        />
        {body}
      </label>
    );
  }
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      data-testid={testId}
      className={cn(shell, focusRing)}
    >
      {body}
    </button>
  );
}

// Two or three discs in a centred row, 12 apart, standing half over the photo's bottom edge.
export function ActionDiscs({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative z-10 -mt-7 flex justify-center gap-3', className)}>{children}</div>
  );
}
