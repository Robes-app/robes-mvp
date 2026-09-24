import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Chip, Pill } from './pill';

function Toggle() {
  const [on, setOn] = useState(false);
  return (
    <Pill selected={on} onClick={() => setOn(!on)}>
      Knitwear
    </Pill>
  );
}

describe('Pill and Chip', () => {
  it('toggles with aria-pressed and uses outline + ink, never a black fill, when selected', async () => {
    render(<Toggle />);
    const pill = screen.getByRole('button', { name: 'Knitwear' });
    expect(pill).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(pill);
    expect(pill).toHaveAttribute('aria-pressed', 'true');
    expect(pill).toHaveClass('border-ink', 'text-ink');
    expect(pill.className).not.toMatch(/\bbg-ink\b/);
    pill.focus();
    await userEvent.keyboard(' ');
    expect(pill).toHaveAttribute('aria-pressed', 'false');
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
