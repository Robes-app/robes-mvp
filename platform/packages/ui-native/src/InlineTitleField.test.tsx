import { fireEvent, render, screen } from '@testing-library/react-native';
import { InlineTitleField } from './InlineTitleField';
import { fonts } from './scale';

async function setup(props: Partial<Parameters<typeof InlineTitleField>[0]> = {}) {
  const onCommit = jest.fn();
  const onCancel = jest.fn();
  await render(
    <InlineTitleField
      value="Gallery opening"
      label="Name the day"
      onCommit={onCommit}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onCommit, onCancel, input: screen.getByLabelText('Name the day') };
}

test('opens focused on the title with it selected', async () => {
  const { input } = await setup();
  expect(input.props.autoFocus).toBe(true);
  expect(input.props.selectTextOnFocus).toBe(true);
  expect(input.props.value).toBe('Gallery opening');
});

test('done commits the trimmed value once, though the blur follows', async () => {
  const { input, onCommit } = await setup();
  await fireEvent.changeText(input, '  Dinner  ');
  await fireEvent(input, 'submitEditing');
  await fireEvent(input, 'blur');
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit).toHaveBeenCalledWith('Dinner');
});

test('blur commits', async () => {
  const { input, onCommit } = await setup();
  await fireEvent.changeText(input, 'Supper');
  await fireEvent(input, 'blur');
  expect(onCommit).toHaveBeenCalledWith('Supper');
});

test('an empty value commits as empty, unless the title is required', async () => {
  const day = await setup();
  await fireEvent.changeText(day.input, '   ');
  await fireEvent(day.input, 'submitEditing');
  expect(day.onCommit).toHaveBeenCalledWith('');
});

test('an empty required title (a look) is refused: it cancels', async () => {
  const look = await setup({ required: true });
  await fireEvent.changeText(look.input, '');
  await fireEvent(look.input, 'submitEditing');
  expect(look.onCommit).not.toHaveBeenCalled();
  expect(look.onCancel).toHaveBeenCalledTimes(1);
});

test('is the title: its face and size, an underline that goes ink on focus, 44pt tall', async () => {
  const { input } = await setup({ size: 30, italic: true, weight: 'regular' });
  expect(input.props.style).toMatchObject({
    fontSize: 30,
    fontFamily: fonts.displayRegularItalic,
    minHeight: 44,
  });
  expect(input.props.className).toContain('border-border-control');
  expect(input.props.className).not.toContain('rounded-input');
  await fireEvent(input, 'focus');
  expect(screen.getByLabelText('Name the day').props.className).toContain('border-b-2 border-ink');
});

test('standing (the draft composer): controlled, not focused, commits each time she leaves it', async () => {
  const onChange = jest.fn();
  const { input, onCommit } = await setup({
    autoFocus: false,
    align: 'center',
    value: 'Sunday style',
    onChange,
  });
  expect(input.props.autoFocus).toBe(false);
  expect(input.props.className).toContain('text-center');
  await fireEvent.changeText(input, 'Sunday');
  expect(onChange).toHaveBeenCalledWith('Sunday');
  await fireEvent(input, 'focus');
  await fireEvent(input, 'blur');
  await fireEvent(input, 'focus');
  await fireEvent(input, 'blur');
  expect(onCommit).toHaveBeenCalledTimes(2);
  expect(onCommit).toHaveBeenCalledWith('Sunday style');
});
