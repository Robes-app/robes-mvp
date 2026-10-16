import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Switch } from './switch';

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <Switch
      label="Morning cue"
      hint="Today’s look"
      checked={on}
      disabled={disabled}
      onChange={setOn}
    />
  );
}

describe('Switch', () => {
  it('is a labelled switch described by its hint that toggles from the row', async () => {
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Morning cue' });
    expect(sw).toHaveAccessibleDescription('Today’s look');
    await userEvent.click(screen.getByText('Morning cue'));
    expect(sw).toBeChecked();
  });

  it('does nothing when disabled', async () => {
    render(<Harness disabled />);
    await userEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('has no serious accessibility violations', async () => {
    render(<Harness />);
    expect(await seriousViolations()).toEqual([]);
  });
});
