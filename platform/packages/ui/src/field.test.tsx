import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { Field, Select, TextArea } from './field';

describe('Field, TextArea, Select', () => {
  it('labels the input and wires hint and error for assistive tech', async () => {
    const onChange = vi.fn();
    render(
      <Field
        label="Email"
        hint="We’ll send a code."
        error="That email doesn’t look quite right."
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(
      'We’ll send a code. That email doesn’t look quite right.',
    );
    expect(input).toHaveClass('border-danger');
    expect(screen.getByRole('alert')).toHaveTextContent('That email doesn’t look quite right.');
    expect(screen.getByRole('alert').querySelector('svg')).not.toBeNull();
    await userEvent.type(input, 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('uses the 3:1 control border when valid', () => {
    render(<Field label="First name" />);
    const input = screen.getByLabelText('First name');
    expect(input).toHaveClass('border-border-control');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('text area and select are labelled and operable', async () => {
    const onChange = vi.fn();
    render(
      <>
        <TextArea label="Notes" />
        <Select
          label="Season"
          placeholder="Choose one"
          options={[
            { value: 'spring', label: 'Spring' },
            { value: 'autumn', label: 'Autumn' },
          ]}
          onChange={onChange}
        />
      </>,
    );
    await userEvent.type(screen.getByLabelText('Notes'), 'Worn open');
    expect(screen.getByLabelText('Notes')).toHaveValue('Worn open');
    const select = screen.getByLabelText('Season');
    expect(select).toHaveValue('');
    await userEvent.selectOptions(select, 'autumn');
    expect(select).toHaveValue('autumn');
    expect(onChange).toHaveBeenCalled();
  });

  it('has no serious accessibility violations', async () => {
    render(
      <main>
        <Field label="Email" error="That email doesn’t look quite right." />
        <TextArea label="Notes" hint="Optional." />
        <Select label="Season" options={[{ value: 'spring', label: 'Spring' }]} />
      </main>,
    );
    expect(await seriousViolations()).toEqual([]);
  });
});
