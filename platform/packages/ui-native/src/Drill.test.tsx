import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DrawerHeader } from './DrawerHeader';
import { DrillList, DrillRow } from './Drill';
import { Sheet } from './Sheet';

test('a drill card: 48pt rows, the summary in its label, faint when muted, no chevron on a row that only reads', async () => {
  const open = jest.fn();
  await render(
    <DrillList testID="list">
      <DrillRow first label="Notifications" value="2 new" onPress={open} testID="first" />
      <DrillRow label="Tags" value="None" muted onPress={jest.fn()} testID="muted" />
      <DrillRow label="Email" value="her@example.com" testID="static" />
    </DrillList>,
  );
  expect(screen.getByTestId('list').props.className).toContain('rounded-soft');
  const row = screen.getByRole('button', { name: 'Notifications · 2 new' });
  expect(row.props.style).toMatchObject({ height: 48, borderTopWidth: 0 });
  expect(screen.getByTestId('muted').props.style).toMatchObject({ borderTopWidth: 0.5 });
  expect(screen.getByText('None').props.className).toContain('text-ink-faint');
  expect(screen.getByText('2 new').props.className).toContain('text-ink-muted');
  // A row that only reads is not a control.
  expect(screen.queryByRole('button', { name: /Email/ })).toBeNull();
  expect(screen.getByText('her@example.com')).toBeTruthy();
  await fireEvent.press(row);
  expect(open).toHaveBeenCalledTimes(1);
});

test('the drawer header: × closes, the done disc dims at 35% while it waits', async () => {
  const close = jest.fn();
  const done = jest.fn();
  await render(
    <DrawerHeader
      title="Draft look"
      onClose={close}
      closeLabel="Close"
      done={{ label: 'Save look', onPress: done, disabled: true }}
    />,
  );
  expect(screen.getByRole('header', { name: 'Draft look' })).toBeTruthy();
  const disc = screen.getByRole('button', { name: 'Save look' });
  expect(disc.props.style).toMatchObject({ opacity: 0.35 });
  await fireEvent.press(disc);
  expect(done).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(close).toHaveBeenCalledTimes(1);
});

test('a Sheet with done takes the drawer header in place of the handle and the question', async () => {
  const close = jest.fn();
  const done = jest.fn();
  await render(
    <SafeAreaProvider>
      <Sheet open onClose={close} title="Notifications" done={{ label: 'Done', onPress: done }}>
        <Text>Nothing new.</Text>
      </Sheet>
    </SafeAreaProvider>,
  );
  expect(await screen.findByText('Nothing new.')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Notifications' })).toBeTruthy();
  // One close only: the handle is gone.
  expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(done).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(close).toHaveBeenCalledTimes(1);
});
