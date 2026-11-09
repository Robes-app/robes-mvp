import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GlassSheet } from './Sheet';
import { TileSheet } from './TileSheet';

const tiles = (onUrl = jest.fn()) =>
  [
    { icon: 'link', label: 'Paste URL', onPress: onUrl },
    { icon: 'camera', label: 'Photo', onPress: jest.fn() },
    { icon: 'receipt', label: 'From receipt', onPress: jest.fn(), badge: 13 },
  ] as const;

test('a glass sheet has the × at the left, the title and a text action', async () => {
  const onClear = jest.fn();
  const onClose = jest.fn();
  await render(
    <GlassSheet
      open
      onClose={onClose}
      title="Filter"
      action={{ label: 'Clear', onPress: onClear, disabled: false }}
    >
      <Text>Season</Text>
    </GlassSheet>,
  );
  expect(screen.getByRole('header', { name: 'Filter' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
  expect(onClear).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('Clear is faint and inert while nothing is picked', async () => {
  const onClear = jest.fn();
  await render(
    <GlassSheet
      open
      onClose={jest.fn()}
      title="Filter"
      action={{ label: 'Clear', onPress: onClear, disabled: true }}
    >
      <Text>Season</Text>
    </GlassSheet>,
  );
  const clear = screen.getByRole('button', { name: 'Clear' });
  expect(clear.props.accessibilityState).toEqual({ disabled: true });
  await fireEvent.press(clear);
  expect(onClear).not.toHaveBeenCalled();
});

test('a tile sheet shows three tiles, a badge, and runs a tile on press', async () => {
  const onUrl = jest.fn();
  await render(<TileSheet open onClose={jest.fn()} title="Add Pieces" tiles={tiles(onUrl)} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Paste URL' }));
  expect(onUrl).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'From receipt, 13' })).toBeTruthy();
  expect(screen.getByText('13')).toBeTruthy();
});

test('the selected tile is outlined and the others sit back, with the flow beneath', async () => {
  await render(
    <TileSheet open onClose={jest.fn()} title="Add from Link" tiles={tiles()} selected="Paste URL">
      <Text>Paste a link</Text>
    </TileSheet>,
  );
  expect(screen.getByRole('button', { name: 'Paste URL' })).toHaveStyle({ opacity: 1 });
  expect(screen.getByRole('button', { name: 'Photo' })).toHaveStyle({ opacity: 0.45 });
  expect(screen.getByRole('button', { name: 'Paste URL' }).props.accessibilityState).toEqual({
    selected: true,
  });
  expect(screen.getByText('Paste a link')).toBeTruthy();
});
