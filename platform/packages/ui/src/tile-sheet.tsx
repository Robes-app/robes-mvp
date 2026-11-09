'use client';

import { Icon, type IconName } from '@robes/icons/web';
import type { ReactNode } from 'react';
import { cn, focusRing } from './cn';
import { GlassSheet, type GlassSheetProps } from './dialog';

export interface SheetTile {
  icon: IconName;
  // Authored in sentence case; the tile shows it in the label caps.
  label: string;
  onClick: () => void;
  // A count waiting behind the tile (receipts to review), on an ink disc at its corner.
  badge?: number;
  testId?: string;
}

export interface TileSheetProps extends Omit<GlassSheetProps, 'children'> {
  tiles: readonly SheetTile[];
  // The tile whose flow is open inside the sheet (Paste URL once its field shows): it takes an
  // ink outline and the others sit back at 45%.
  selected?: string;
  // What the open flow shows under the tiles: the link field, the receipts inbox.
  children?: ReactNode;
}

// The Front Door's action sheet (PRD rev 3 §2.4 "glass action sheet"): a GlassSheet with three
// tiles — a glyph over a tracked label on a white card — for New Look, Add Pieces and Add your
// pieces. Twin of ui-native TileSheet.tsx.
export function TileSheet({ tiles, selected, children, ...sheet }: TileSheetProps) {
  const dimmed = selected !== undefined;
  return (
    <GlassSheet {...sheet}>
      <div className="flex gap-2.5">
        {tiles.map((tile) => {
          const picked = tile.label === selected;
          return (
            <button
              key={tile.label}
              type="button"
              onClick={tile.onClick}
              aria-pressed={dimmed ? picked : undefined}
              aria-label={tile.badge !== undefined ? `${tile.label}, ${tile.badge}` : tile.label}
              data-testid={tile.testId}
              className={cn(
                'relative flex h-[72px] flex-1 flex-col items-center justify-center gap-2 rounded-card bg-surface-raised motion-safe:transition-opacity',
                picked
                  ? 'border-[1.5px] border-ink'
                  : 'border-[0.5px] border-rule-mid hover:border-ink',
                dimmed && !picked && 'opacity-45',
                focusRing,
              )}
            >
              <Icon name={tile.icon} size={18} />
              <span className="type-label truncate text-ink-muted">{tile.label}</span>
              {tile.badge !== undefined && tile.badge > 0 ? (
                <span
                  aria-hidden
                  className="type-label absolute -top-1.5 -right-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-ink px-1 tracking-normal text-bg"
                >
                  {tile.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {children}
    </GlassSheet>
  );
}
