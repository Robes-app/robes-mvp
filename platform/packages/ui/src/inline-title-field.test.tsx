import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { seriousViolations } from '../test/axe';
import { InlineTitleField } from './inline-title-field';

function setup(props: Partial<Parameters<typeof InlineTitleField>[0]> = {}) {
  const onCommit = vi.fn();
  const onCancel = vi.fn();
  render(
    <InlineTitleField
      value="Gallery opening"
      label="Name the day"
      onCommit={onCommit}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onCommit, onCancel, input: screen.getByRole('textbox', { name: 'Name the day' }) };
}

describe('InlineTitleField', () => {
  it('opens focused with the title selected, so typing replaces it', async () => {
    const { input, onCommit } = setup();
    expect(input).toHaveFocus();
    expect((input as HTMLInputElement).selectionStart).toBe(0);
    expect((input as HTMLInputElement).selectionEnd).toBe('Gallery opening'.length);
    await userEvent.keyboard('Dinner{Enter}');
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('Dinner');
  });

  it('commits the trimmed value on blur, once', async () => {
    const { input, onCommit } = setup();
    await userEvent.keyboard('  Supper  ');
    input.blur();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('Supper');
  });

  it('Escape cancels and its blur commits nothing', async () => {
    const { input, onCommit, onCancel } = setup();
    await userEvent.keyboard('Nope{Escape}');
    input.blur();
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('an empty value commits as empty (the day goes back to unnamed)', async () => {
    const day = setup();
    await userEvent.clear(day.input);
    await userEvent.keyboard('{Enter}');
    expect(day.onCommit).toHaveBeenCalledExactlyOnceWith('');
    expect(day.onCancel).not.toHaveBeenCalled();
  });

  it('an empty required title (a look) is refused: it cancels', async () => {
    const look = setup({ required: true });
    await userEvent.clear(look.input);
    await userEvent.keyboard('{Enter}');
    expect(look.onCommit).not.toHaveBeenCalled();
    expect(look.onCancel).toHaveBeenCalledOnce();
  });

  it('is the title: the serif at the heading size, an underline and no box', async () => {
    const { input } = setup({ size: 'lg', italic: true, placeholder: 'Name the day' });
    expect(input).toHaveClass('font-display', 'text-3xl', 'italic', 'border-b', 'outline-none!');
    expect(input).toHaveClass('min-h-11', 'focus-visible:border-ink');
    expect(input).not.toHaveClass('rounded-input');
    expect(input).toHaveAttribute('placeholder', 'Name the day');
    expect(await seriousViolations()).toEqual([]);
  });

  it('standing (the draft composer): controlled, not focused, and commits each time she leaves it', async () => {
    const onChange = vi.fn();
    const { input, onCommit, onCancel } = setup({
      autoFocus: false,
      align: 'center',
      value: '',
      onChange,
    });
    expect(input).not.toHaveFocus();
    expect(input).toHaveClass('text-center');
    await userEvent.click(input);
    await userEvent.keyboard('S');
    expect(onChange).toHaveBeenCalledWith('S');
    await userEvent.keyboard('{Enter}');
    expect(input).not.toHaveFocus();
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('');
    await userEvent.click(input);
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledOnce();
  });
});
