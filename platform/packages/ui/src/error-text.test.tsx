import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorText } from './error-text';

describe('ErrorText', () => {
  it('is an alert in danger with its icon, read as the sentence alone', () => {
    render(<ErrorText>Robes couldn’t read that photo.</ErrorText>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('text-danger');
    expect(alert).toHaveAccessibleName('');
    expect(alert).toHaveTextContent('Robes couldn’t read that photo.');
    expect(alert.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
