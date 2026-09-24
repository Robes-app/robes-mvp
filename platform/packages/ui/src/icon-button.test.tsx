import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { IconButton } from './icon-button';

describe('IconButton', () => {
  it('is named by its label and has a 44px target', async () => {
    const onClick = vi.fn();
    render(<IconButton icon="close" label="Close" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Close' });
    expect(button).toHaveClass('size-11');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('requires a label at the type level', () => {
    // @ts-expect-error label is required
    const element = <IconButton icon="close" />;
    expect(element).toBeTruthy();
  });

  it('has no serious accessibility violations', async () => {
    render(<IconButton icon="more" label="More" outlined />);
    expect(await seriousViolations()).toEqual([]);
  });
});
