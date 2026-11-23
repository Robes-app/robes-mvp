import { admin as copy } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import type { ReactNode } from 'react';
import { stamp } from './dates';

// The admin user page's parts, after beta's: white panels on the cream page, short timelines
// that fold past a few rows, and photo tiles in a grid.

export function Section({
  title,
  count,
  note,
  children,
}: {
  title: string;
  count?: number;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <h2 className="type-eyebrow flex flex-wrap items-baseline gap-x-3 text-accent-warm">
        <span>{title}</span>
        {count === undefined ? null : <span className="text-ink-muted tabular-nums">{count}</span>}
        {note ? (
          <span className="font-sans text-xs tracking-normal normal-case text-ink-muted">
            {note}
          </span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-tile border-[0.5px] border-rule-mid bg-surface-raised">
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-center font-sans text-sm text-ink-muted">{children}</p>;
}

export function Chip({ children, tone }: { children: ReactNode; tone?: 'danger' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border-[0.5px] px-2 py-0.5 font-sans text-[11px] leading-normal ${
        tone === 'danger' ? 'border-danger text-danger' : 'border-rule-mid text-ink'
      }`}
    >
      {children}
    </span>
  );
}

// Label/value rows in a panel (Profile · Style DNA).
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <Panel>
      <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-4 gap-y-1.5 px-4 py-3 font-sans text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

export interface TimelineItem {
  key: string;
  at: string;
  body: ReactNode;
}

const SHOWN = 6;

function Row({ item }: { item: TimelineItem }) {
  return (
    <li className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-3 border-b-[0.5px] border-hairline px-4 py-2.5 font-sans text-sm last:border-b-0">
      <span className="text-xs text-ink-muted tabular-nums">{stamp(item.at)}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 break-words">
        {item.body}
      </div>
    </li>
  );
}

// A short timeline, newest first; past a few rows the rest fold behind "Show all".
export function Timeline({ items, empty }: { items: TimelineItem[]; empty: string }) {
  if (items.length === 0) {
    return (
      <Panel>
        <Empty>{empty}</Empty>
      </Panel>
    );
  }
  const head = items.slice(0, SHOWN);
  const rest = items.slice(SHOWN);
  return (
    <Panel>
      <ul>
        {head.map((item) => (
          <Row key={item.key} item={item} />
        ))}
      </ul>
      {rest.length ? (
        <details className="group border-t-[0.5px] border-hairline">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 font-sans text-sm text-ink underline underline-offset-4 group-open:hidden">
            {copy.user.page.showAll(items.length)}
          </summary>
          <ul>
            {rest.map((item) => (
              <Row key={item.key} item={item} />
            ))}
          </ul>
        </details>
      ) : null}
    </Panel>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="text-ink-muted">{children}</span>;
}

// A photo tile: her photograph over its name and a meta line.
export function Tile({
  src,
  title,
  meta,
  starred,
}: {
  src: string | null;
  title: string;
  meta: string;
  starred?: boolean;
}) {
  return (
    <li className="min-w-0 overflow-hidden rounded-tile border-[0.5px] border-rule-mid bg-surface-raised">
      <div className="relative aspect-[4/5] bg-surface-sunk">
        {src ? (
          // biome-ignore lint/performance/noImgElement: a short-lived signed URL the image optimiser can't fetch
          <img src={src} alt="" loading="lazy" className="size-full object-cover" />
        ) : null}
        {starred ? (
          <span className="absolute top-1.5 right-1.5 text-ink">
            <Icon name="star" size={14} filled label={copy.user.page.hero} />
          </span>
        ) : null}
      </div>
      <div className="px-2.5 py-2 font-sans">
        <p className="truncate text-sm text-ink" title={title}>
          {title}
        </p>
        <p className="truncate text-xs text-ink-muted" title={meta}>
          {meta}
        </p>
      </div>
    </li>
  );
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">{children}</ul>;
}
