import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('is decorative, shape-matched and only pulses when motion is allowed', () => {
    const { container } = render(<Skeleton shape="circle" className="size-11" />);
    const el = container.firstElementChild;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el).toHaveClass('rounded-pill', 'size-11', 'motion-safe:animate-pulse');
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main aria-busy="true">
        <Skeleton shape="text" />
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
