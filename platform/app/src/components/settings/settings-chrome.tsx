import { ui } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import {
  DrillRowContent,
  type DrillRowContentProps,
  drillRowClass,
  Eyebrow,
  SubviewBackIcon,
  SubviewHeader,
  subviewBackClass,
} from '@robes/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

// Settings' own chrome (legacy settings.html, redlines 2026-10-08 G1–G3): a pushed stack, so no
// wordmark, no avatar and no dock. One 44pt row on every screen — ‹ at the left (decided 27 Oct, both platforms), the page's title
// centred in the serif, nothing at the right — over a centred 720 column (the twin runs 1100).
// The app shell stands down on /you (isSettingsPath). Native twin: components/StackScreen.tsx.

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

export function SettingsHeader({ title, back }: { title: string; back: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-bg/95 backdrop-blur">
      <div className="mx-auto grid h-11 max-w-[1440px] grid-cols-[44px_minmax(0,1fr)_44px] items-center px-5 md:px-20">
        <Link
          href={back}
          aria-label={ui.back}
          className={`-ml-2.5 flex size-11 items-center justify-center rounded-pill text-ink hover:text-ink-muted ${focus}`}
        >
          <Icon name="back" size={22} />
        </Link>
        <h1 className="truncate px-1 text-center font-display text-[22px] text-ink leading-[44px] max-[374px]:text-[19px]">
          {title}
        </h1>
        <span aria-hidden />
      </div>
    </header>
  );
}

// The back control over a photograph (digital twin redlines R2): a 44px glass disc, 14px from the
// top-left of the safe area, the chevron in ink. Native twin: components/StackScreen.tsx bare.
export function FloatingBack({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label={ui.back}
      className={`absolute top-[calc(env(safe-area-inset-top)+14px)] left-3.5 z-40 flex size-11 items-center justify-center rounded-pill bg-veil text-ink backdrop-blur-[22px] ${focus}`}
    >
      <Icon name="back" size={18} />
    </Link>
  );
}

// A drill row that is a door (Felix SettingsView): a page in the app, a mailto, or a page outside
// it (↗, a new tab). Rows that open in place use DrillRow from @robes/ui.
export function DrillLink({
  href,
  external = false,
  ...content
}: DrillRowContentProps & { href: string; external?: boolean }) {
  const body = (
    <DrillRowContent
      {...content}
      {...(external
        ? { trailing: <Icon name="external" size={14} className="shrink-0 text-ink-faint" /> }
        : {})}
    />
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={drillRowClass}>
        {body}
      </a>
    );
  }
  if (href.startsWith('mailto:')) {
    return (
      <a href={href} className={drillRowClass}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} className={drillRowClass}>
      {body}
    </Link>
  );
}

export function SettingsPage({
  title,
  back,
  sub,
  wide = false,
  narrow = false,
  bare = false,
  subview = false,
  children,
}: {
  title: string;
  back: string;
  // One line under the header, centred (legacy .sp-pagesub).
  sub?: string;
  wide?: boolean;
  // A twin sub-page (Colouring, Body shape) reads in a 560 column (legacy #sub-wrap).
  narrow?: boolean;
  // No header bar (redlines R1): the page's picture starts under the safe area and the back
  // control floats over it (`title` names the document only).
  bare?: boolean;
  // Felix's subview header (SettingsView): the back chevron, the serif title centred, a 56px
  // bar over a 0.5px rule; the body pads 20 at the sides.
  subview?: boolean;
  children: ReactNode;
}) {
  if (subview) {
    return (
      <div className="relative flex min-h-dvh flex-col bg-bg">
        <div className="sticky top-0 z-40 bg-bg">
          <SubviewHeader
            title={title}
            serif
            back={
              <Link href={back} aria-label={ui.back} className={subviewBackClass}>
                <SubviewBackIcon />
              </Link>
            }
          />
        </div>
        <div className="mx-auto w-full max-w-[720px] flex-1 px-5 pt-1.5 pb-[calc(32px+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex min-h-dvh flex-col bg-bg">
      {bare ? (
        <>
          <h1 className="sr-only">{title}</h1>
          <FloatingBack href={back} />
        </>
      ) : (
        <SettingsHeader title={title} back={back} />
      )}
      <div
        className={`mx-auto w-full max-w-[1440px] flex-1 px-6 pb-[calc(40px+env(safe-area-inset-bottom))] md:px-20 md:pb-20 ${bare ? 'pt-0 md:pt-6' : 'pt-6'}`}
      >
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

// A titled white card of rows (legacy .sp-gk + .sp-group; redlines R6/R7 2026-11-05: 12px radius
// on the firmer hairline, the eyebrow at the smallest caps).
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
        <Eyebrow id={id} className="app-caps ml-0.5">
          {title}
        </Eyebrow>
      ) : null}
      <div className="overflow-hidden rounded-soft border-[0.5px] border-rule-mid bg-surface-raised">
        {children}
      </div>
    </section>
  );
}

// Rows ≥ 62px, 12/16 padding, a hairline between them (redlines R6).
export const settingsRowClass = `flex min-h-[62px] w-full items-center gap-3.5 border-hairline border-t px-4 py-3 text-left first:border-t-0 ${focus}`;

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
          className={`font-display text-lg leading-tight ${tone === 'danger' ? 'text-danger' : 'text-ink'}`}
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
            className="shrink-0 text-ink-muted"
          />
        ) : null)}
    </>
  );
}

// A row with an on/off switch: a 36×22 track, ink-soft when on (ink stays for the one commitment),
// cream when off; the row is the target. Native twin: mobile/src/features/you/Settings.tsx.
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
        className={`relative h-[22px] w-9 shrink-0 rounded-pill border motion-safe:transition-colors ${checked ? 'border-ink-muted bg-ink-muted' : 'border-rule-mid bg-surface-sunk'}`}
      >
        <span
          className={`absolute top-[2px] left-[2px] size-4 rounded-pill bg-surface-raised shadow-sm motion-safe:transition-transform ${checked ? 'translate-x-[14px]' : ''}`}
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
