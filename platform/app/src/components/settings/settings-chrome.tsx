import { ui } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Eyebrow } from '@robes/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

// Settings' own chrome (legacy settings.html, redlines 2026-10-08 G1–G3): a pushed stack, so no
// wordmark, no avatar and no dock. One 44pt row on every screen — ← at the left, the page's title
// centred in the serif, nothing at the right — over a centred 720 column (the twin runs 1100).
// The app shell stands down on /you (isSettingsPath). Native twin: components/StackScreen.tsx.

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export function SettingsHeader({ title, back }: { title: string; back: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-bg/95 backdrop-blur">
      <div className="mx-auto grid h-11 max-w-[1440px] grid-cols-[44px_minmax(0,1fr)_44px] items-center px-5 md:px-20">
        <Link
          href={back}
          aria-label={ui.back}
          className={`-ml-2.5 flex size-11 items-center justify-center rounded-pill text-ink hover:text-ink-muted ${focus}`}
        >
          <Icon name="arrowLeft" size={22} />
        </Link>
        <h1 className="truncate px-1 text-center font-display text-[22px] text-ink leading-[44px] max-[374px]:text-[19px]">
          {title}
        </h1>
        <span aria-hidden />
      </div>
    </header>
  );
}

export function SettingsPage({
  title,
  back,
  sub,
  wide = false,
  narrow = false,
  children,
}: {
  title: string;
  back: string;
  // One line under the header, centred (legacy .sp-pagesub).
  sub?: string;
  wide?: boolean;
  // A twin sub-page (Colouring, Body shape) reads in a 560 column (legacy #sub-wrap).
  narrow?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <SettingsHeader title={title} back={back} />
      <div className="mx-auto w-full max-w-[1440px] flex-1 px-6 pt-6 pb-[calc(40px+env(safe-area-inset-bottom))] md:px-20 md:pb-20">
        <div
          className={`mx-auto w-full ${wide ? 'max-w-[1100px]' : narrow ? 'max-w-[560px]' : 'max-w-[720px]'}`}
        >
          {sub ? (
            <p className="mx-auto mb-[22px] max-w-[520px] text-center font-light font-sans text-ink-muted text-xs leading-normal">
              {sub}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

// A titled white card of rows (legacy .sp-gk + .sp-group).
export function SettingsGroup({
  id,
  title,
  children,
}: {
  id?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={title ? id : undefined} className="flex flex-col gap-2.5">
      {title ? (
        <Eyebrow id={id} className="ml-0.5 text-[9.5px]">
          {title}
        </Eyebrow>
      ) : null}
      <div className="overflow-hidden rounded-soft border border-hairline bg-surface-raised">
        {children}
      </div>
    </section>
  );
}

export const settingsRowClass = `flex min-h-[60px] w-full items-center gap-3.5 border-hairline border-t px-[18px] py-3.5 text-left first:border-t-0 ${focus}`;

export interface SettingsRowProps {
  label: string;
  // Her answer, at the right; `empty` sets it in the faint italic ("Not yet").
  value?: string;
  empty?: boolean;
  sub?: string;
  tone?: 'danger';
  href?: string;
  external?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
}

// One row (legacy .sp-row): the serif name, a sans sub, her value at the right, then › (or ↗).
export function SettingsRowContent({
  label,
  value,
  empty = false,
  sub,
  tone,
  chevron = 'forward',
  trailing,
}: Pick<SettingsRowProps, 'label' | 'value' | 'empty' | 'sub' | 'tone' | 'trailing'> & {
  chevron?: 'forward' | 'external' | null;
}) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={`font-display text-[17px] leading-tight ${tone === 'danger' ? 'text-danger' : 'text-ink'}`}
        >
          {label}
        </span>
        {sub ? (
          <span className="font-light font-sans text-ink-muted text-xs leading-snug">{sub}</span>
        ) : null}
      </span>
      {value ? (
        <span
          className={`max-w-[56%] truncate text-right ${empty ? 'font-display text-[17px] text-ink-faint italic' : 'font-light font-sans text-[13px] text-ink-muted'}`}
        >
          {value}
        </span>
      ) : null}
      {trailing ??
        (chevron ? (
          <Icon
            name={chevron}
            size={chevron === 'external' ? 14 : 16}
            className="shrink-0 text-ink-faint"
          />
        ) : null)}
    </>
  );
}

// A row with an on/off switch (legacy .sp-tog): a 42×24 track, ink when on; the row is the target.
export function SettingsToggleRow({
  label,
  sub,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`${settingsRowClass} hover:bg-surface disabled:cursor-default`}
    >
      <SettingsRowContent label={label} sub={sub} chevron={null} />
      <span
        aria-hidden
        className={`relative h-6 w-[42px] shrink-0 rounded-pill border motion-safe:transition-colors ${checked ? 'border-ink bg-ink' : 'border-border-control bg-surface-sunk'}`}
      >
        <span
          className={`absolute top-[2px] left-[2px] size-[18px] rounded-pill bg-surface-raised shadow-sm motion-safe:transition-transform ${checked ? 'translate-x-[18px]' : ''}`}
        />
      </span>
    </button>
  );
}

export function SettingsRow({ href, external = false, onClick, ...rest }: SettingsRowProps) {
  const body = (
    <SettingsRowContent
      {...rest}
      chevron={href || onClick ? (external ? 'external' : 'forward') : null}
    />
  );
  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`${settingsRowClass} hover:bg-surface`}
      >
        {body}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={`${settingsRowClass} hover:bg-surface`}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${settingsRowClass} hover:bg-surface`}>
        {body}
      </button>
    );
  }
  return <div className={settingsRowClass}>{body}</div>;
}
