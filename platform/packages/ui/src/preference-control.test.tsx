import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PreferenceControl } from './preference-control';

const labels = { avoid: 'Avoid', none: 'No view', love: 'Love' };

describe('PreferenceControl', () => {
  it('reads as a radio group with the answer checked', () => {
    render(<PreferenceControl label="Blues" value={1} labels={labels} onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: 'Blues' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Love' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Avoid' })).toHaveAttribute('aria-checked', 'false');
  });

  it('answers with the verb that was tapped', async () => {
    const onChange = vi.fn();
    render(<PreferenceControl label="Blues" value={0} labels={labels} onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Avoid' }));
    expect(onChange).toHaveBeenCalledWith(-1);
  });

  // A shade with no answer of its own sits on its family's answer, and says so.
  it('names the family a following shade takes its answer from', () => {
    render(
      <PreferenceControl
        label="Cobalt"
        value={null}
        inherited={-1}
        follows="Blues"
        labels={labels}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Cobalt: following Blues' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Avoid' })).toHaveAttribute('aria-checked', 'true');
  });

  it('moves and answers with the arrow keys', async () => {
    const onChange = vi.fn();
    render(<PreferenceControl label="Blues" value={0} labels={labels} onChange={onChange} />);
    screen.getByRole('radio', { name: 'No view' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
