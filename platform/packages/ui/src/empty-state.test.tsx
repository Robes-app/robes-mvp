import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Button } from './button';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('shows a title, body and one door', () => {
    render(
      <EmptyState
        title="Left free."
        body="Add a piece and Robes will dress it three ways."
        action={<Button>Add a piece</Button>}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Left free.' })).toBeInTheDocument();
    expect(screen.getByText('Add a piece and Robes will dress it three ways.')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <EmptyState
          title="Left free."
          body="Nothing planned this week."
          action={<Button>Plan a day</Button>}
        />
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
