import { ui } from '@robes/copy';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { PROGRESS_STAGES, Progress } from './progress';

describe('Progress', () => {
  it('labels each stage from copy', () => {
    for (const stage of PROGRESS_STAGES) {
      const { unmount } = render(<Progress stage={stage} />);
      expect(screen.getByRole('progressbar', { name: ui.progress[stage] })).toBeInTheDocument();
      unmount();
    }
  });

  it('reports a clamped value when known and none while indeterminate', () => {
    const { rerender } = render(<Progress stage="styling" value={0.42} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuetext', `${ui.progress.styling} 42%`);
    rerender(<Progress stage="styling" value={3} />);
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    rerender(<Progress stage="reading" />);
    expect(bar).not.toHaveAttribute('aria-valuenow');
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <Progress stage="dressing" value={0.5} />
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
