import { fireEvent, render, screen } from '@testing-library/react-native';
import { Field } from './Field';

test('labels the input and forwards typing', async () => {
  const onChangeText = jest.fn();
  await render(<Field label="Email" value="" onChangeText={onChangeText} />);
  await fireEvent.changeText(screen.getByLabelText('Email'), 'ann@test.dev');
  expect(onChangeText).toHaveBeenCalledWith('ann@test.dev');
  expect(screen.getByLabelText('Email').props.className).toContain('border-border-control');
});

test('an error is an alert in danger with an icon, and becomes the input hint', async () => {
  await render(<Field label="Email" error="That email doesn’t look quite right." />);
  const alert = screen.getByRole('alert');
  expect(alert).toHaveTextContent('That email doesn’t look quite right.');
  expect(alert.props.className).toContain('text-danger');
  const input = screen.getByLabelText('Email');
  expect(input.props.accessibilityHint).toBe('That email doesn’t look quite right.');
  expect(input.props.className).toContain('border-danger');
  const icons = screen.container.queryAll(
    (node) => node.props.accessibilityElementsHidden === true,
  );
  expect(icons.length).toBeGreaterThan(0);
});

test('a hint shows when there is no error', async () => {
  await render(<Field label="First name" hint="As you’d like Robes to say it." />);
  expect(screen.getByText('As you’d like Robes to say it.')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});
