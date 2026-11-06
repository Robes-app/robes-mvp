import { fireEvent, render, screen } from '@testing-library/react-native';
import { AlertDialog } from './AlertDialog';

test('a confirm names the consequence, offers the way back and dismisses', async () => {
  const discard = jest.fn();
  const keep = jest.fn();
  const dismiss = jest.fn();
  await render(
    <AlertDialog
      open
      title="Discard this draft?"
      message="The look won't be saved or scheduled."
      actions={[
        { label: 'Discard', variant: 'primary', onPress: discard },
        { label: 'Keep editing', variant: 'outline', onPress: keep },
      ]}
      onDismiss={dismiss}
    />,
  );
  expect(screen.getByText('Discard this draft?')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Discard' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }));
  expect(discard).toHaveBeenCalledTimes(1);
  expect(keep).toHaveBeenCalledTimes(1);
});

test('shows nothing while closed', async () => {
  await render(
    <AlertDialog
      open={false}
      title="Discard this draft?"
      actions={[{ label: 'Discard', variant: 'primary', onPress: jest.fn() }]}
      onDismiss={jest.fn()}
    />,
  );
  expect(screen.queryByText('Discard this draft?')).toBeNull();
});
