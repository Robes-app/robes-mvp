import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Eyebrow, Heading, Text } from './text';

describe('Text, Heading, Eyebrow', () => {
  it('renders the heading level and never a serif size below 17px', () => {
    render(
      <>
        <Heading level={1}>Your wardrobe, styled.</Heading>
        <Heading level={4}>Small</Heading>
      </>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('font-display', 'text-4xl');
    const small = screen.getByRole('heading', { level: 4 });
    expect(small.className).toMatch(/text-lg/);
    expect(small.className).not.toMatch(/text-(xs|sm|base)\b/);
  });

  it('sets an italic line in Cormorant, never the sans, at 17px or more', () => {
    render(
      <Text size="small" italic>
        pick one or several
      </Text>,
    );
    const el = screen.getByText('pick one or several');
    expect(el).toHaveClass('font-display', 'italic', 'text-lg');
    expect(el).not.toHaveClass('font-sans');
  });

  it('styles eyebrows as tracked caps and text by tone', () => {
    render(
      <>
        <Eyebrow>Welcome</Eyebrow>
        <Text tone="muted">Body</Text>
      </>,
    );
    expect(screen.getByText('Welcome')).toHaveClass('uppercase', 'text-ink-faint');
    expect(screen.getByText('Body')).toHaveClass('text-ink-muted');
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <Eyebrow>Robes</Eyebrow>
        <Heading level={1}>Sign in.</Heading>
        <Text>Your wardrobe, styled.</Text>
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
