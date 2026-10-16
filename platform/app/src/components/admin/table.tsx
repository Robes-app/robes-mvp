import type { ReactNode } from 'react';

// Dense, readable data tables for the admin area (1280px and up).
export function DataTable({
  caption,
  columns,
  rows,
  empty,
}: {
  caption: string;
  columns: string[];
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
              <th key={c} scope="col" className="py-2 pr-4 font-medium">
                {c}
              </th>
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

const dateTime = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export function when(iso: string | null, empty: string): string {
  return iso ? `${dateTime.format(new Date(iso))} UTC` : empty;
}

export function money(micros: number): string {
  return `$${(micros / 1_000_000).toFixed(micros < 10_000_000 ? 4 : 2)}`;
}
