import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Chip, Pill, pillClasses } from './pill';

function Toggle() {
  const [on, setOn] = useState(false);
  return (
    <Pill selected={on} onClick={() => setOn(!on)}>
      Knitwear
    </Pill>
  );
}

describe('Pill and Chip', () => {
  it('toggles with aria-pressed and is warm when selected, never a black fill', async () => {
    render(<Toggle />);
    const pill = screen.getByRole('button', { name: 'Knitwear' });
    expect(pill).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(pill);
    expect(pill).toHaveAttribute('aria-pressed', 'true');
    expect(pill).toHaveClass('bg-selected', 'border-selected-line', 'text-ink');
    expect(pill.className).not.toMatch(/\bbg-ink\b/);
    pill.focus();
    await userEvent.keyboard(' ');
    expect(pill).toHaveAttribute('aria-pressed', 'false');
  });

  it('lends its anatomy to the controls that are not toggles', () => {
    // A menu trigger or a disclosure wears the pill without claiming aria-pressed.
    render(
      <button type="button" aria-haspopup="menu" className={pillClasses({ selected: true })}>
        Newest
      </button>,
    );
    const trigger = screen.getByRole('button', { name: 'Newest' });
    expect(trigger).not.toHaveAttribute('aria-pressed');
    expect(trigger).toHaveClass('rounded-pill', 'bg-selected', 'border-selected-line');
    expect(pillClasses()).toMatch(/\bborder-border-control\b/);
    expect(pillClasses()).not.toMatch(/\bbg-selected\b/);
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <Pill selected>Selected</Pill>
        <Pill>Not selected</Pill>
        <Chip>In your wardrobe</Chip>
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
