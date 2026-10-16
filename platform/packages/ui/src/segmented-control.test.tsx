import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { SegmentedControl } from './segmented-control';

const OPTIONS = [
  { value: 'today', label: 'Style today' },
  { value: 'trip', label: 'Plan a trip' },
  { value: 'piece', label: 'Style a piece' },
] as const;

function Harness() {
  const [value, setValue] = useState<(typeof OPTIONS)[number]['value']>('today');
  return <SegmentedControl label="Intent" options={OPTIONS} value={value} onChange={setValue} />;
}

describe('SegmentedControl', () => {
  it('is a labelled radio group with one tab stop', async () => {
    render(
      <>
        <Harness />
        <button type="button">After</button>
      </>,
    );
    expect(screen.getByRole('radiogroup', { name: 'Intent' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Style today' })).toBeChecked();
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Style today' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('moves and selects with arrow keys, wrapping, plus Home and End', async () => {
    render(<Harness />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Plan a trip' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Plan a trip' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('radio', { name: 'Style today' })).toBeChecked();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Style a piece' })).toBeChecked();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Style today' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Style a piece' })).toBeChecked();
  });

  it('selects on click', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('radio', { name: 'Plan a trip' }));
    expect(screen.getByRole('radio', { name: 'Plan a trip' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Style today' })).not.toBeChecked();
  });

  it('has no serious accessibility violations', async () => {
    render(<Harness />);
    expect(await seriousViolations()).toEqual([]);
  });
});
