import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from './drawer';

describe('Drawer', () => {
  it('draws the header: × asks the owner, the title is tracked, done waits at 35%', () => {
    const onClose = vi.fn();
    const onDone = vi.fn();
    render(
      <Drawer
        open
        title="Draft look"
        onClose={onClose}
        closeLabel="Close"
        done={{ label: 'Save look', hint: 'Save and schedule', onClick: onDone, disabled: true }}
        testId="drawer"
      >
        <p>Body</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog', { name: 'Draft look' })).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    const done = screen.getByRole('button', { name: 'Save look' });
    expect(done).toHaveAttribute('aria-disabled', 'true');
    expect(done).toHaveAttribute('title', 'Save and schedule');
    expect(done.className).toContain('opacity-35');
    fireEvent.click(done);
    expect(onDone).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape asks the owner too, and a spacer keeps the title centred without done', () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Edit look" onClose={onClose} closeLabel="Close" done={null}>
        <p>Body</p>
      </Drawer>,
    );
    expect(screen.queryByRole('button', { name: /look$/ })).toBeNull();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
