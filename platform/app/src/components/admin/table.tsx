import { Icon } from '@robes/icons/web';
import Link from 'next/link';
import type { ReactNode } from 'react';

// A heading that sorts the table: a link to the same page sorted by it, the arrow on the one
// sorted now (its direction is announced through aria-sort; the chevron is decorative).
export interface SortableColumn {
  label: string;
  href: string;
  sorted?: 'asc' | 'desc' | undefined;
}

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

function Heading({ column }: { column: string | SortableColumn }) {
  if (typeof column === 'string') {
    return (
      <th scope="col" className="py-2 pr-4 font-medium">
        {column}
      </th>
    );
  }
  return (
    <th
      scope="col"
      aria-sort={column.sorted ? ARIA_SORT[column.sorted] : undefined}
      className="pr-4 font-medium"
    >
      <Link
        href={column.href}
        scroll={false}
        // Each view is an audited read; render it when she clicks, not on prefetch.
        prefetch={false}
        className={`inline-flex min-h-11 items-center gap-1 underline-offset-4 hover:underline ${column.sorted ? 'text-ink' : ''}`}
      >
        {column.label}
        {column.sorted ? (
          <Icon
            name="down"
            size={14}
            className={column.sorted === 'asc' ? 'rotate-180' : undefined}
          />
        ) : null}
      </Link>
    </th>
  );
}

// Dense, readable data tables for the admin area (1280px and up).
export function DataTable({
  caption,
  columns,
  rows,
  empty,
}: {
  caption: string;
  columns: (string | SortableColumn)[];
  rows: ReactNode[][];
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left font-sans text-sm text-ink">
        <caption className="mb-2 text-left font-sans text-base text-ink">{caption}</caption>
        <thead>
          <tr className="border-b border-hairline text-ink-muted">
            {columns.map((c) => (
              <Heading key={typeof c === 'string' ? c : c.label} column={c} />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-3 text-ink-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((cells, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are server-rendered and static
              <tr key={i} className="border-b border-hairline align-top">
                {cells.map((cell, j) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed column order
                  <td key={j} className="py-2 pr-4">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export { day, stamp, when } from './dates';

export function money(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(micros < 10_000_000 ? 4 : 2)}`;
}

// Pretty-printed stored JSON, for the output and call viewers.
export function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-crisp border border-hairline bg-surface-sunk p-3 font-mono text-xs text-ink">
      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}
