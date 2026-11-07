import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { DrillList, DrillRow, DrillRowContent, drillRowClass } from './drill';

describe('DrillList and DrillRow', () => {
  it('draws Felix rows on one white card: 48px, a tracked label, the summary, a chevron', async () => {
    const open = vi.fn();
    render(
      <DrillList label="Account" testId="list">
        <DrillRow label="Notifications" value="2 new" onClick={open} testId="row" />
        <DrillRow label="Tags" value="None" muted onClick={vi.fn()} />
        <div className={drillRowClass}>
          <DrillRowContent label="Email" value="her@example.com" trailing={null} />
        </div>
      </DrillList>,
    );
    const list = screen.getByRole('group', { name: 'Account' });
    expect(list).toHaveClass('rounded-soft', 'border-rule-mid', 'bg-surface-raised', 'divide-y');
    const row = screen.getByTestId('row');
    expect(row).toHaveClass('h-12');
    expect(screen.getByText('Notifications')).toHaveClass('type-label', 'text-ink-muted');
    expect(screen.getByText('2 new')).toHaveClass('text-ink-muted');
    expect(screen.getByText('None')).toHaveClass('text-ink-faint');
    expect(row.querySelector('svg')).not.toBeNull();
    // A row that only reads has no chevron.
    expect(screen.getByText('Email').parentElement?.querySelector('svg')).toBeNull();
    await userEvent.click(row);
    expect(open).toHaveBeenCalledOnce();
    expect(await seriousViolations()).toEqual([]);
  });
});
