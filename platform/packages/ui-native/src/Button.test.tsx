import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Button, DOUBLE_PRIMARY_WARNING, IconButton, PrimaryScope } from './Button';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light' },
}));

afterEach(() => jest.clearAllMocks());

test('primary press fires a haptic then the handler', async () => {
  const onPress = jest.fn();
  await render(<Button onPress={onPress}>Save this look</Button>);
  await fireEvent.press(screen.getByRole('button', { name: 'Save this look' }));
  expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('secondary and quiet buttons never buzz', async () => {
  const onPress = jest.fn();
  await render(
    <>
      <Button variant="secondary" onPress={onPress}>
        Wear on a day
      </Button>
      <Button variant="quiet" onPress={onPress}>
        Sign out
      </Button>
    </>,
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Wear on a day' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(onPress).toHaveBeenCalledTimes(2);
  expect(Haptics.impactAsync).not.toHaveBeenCalled();
});

test('loading shows copy from @robes/copy, reports busy and ignores presses', async () => {
  const onPress = jest.fn();
  await render(
    <Button onPress={onPress} loading>
      Continue
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'One moment…' });
  expect(button).toBeBusy();
  expect(button).toBeDisabled();
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
});

test('loadingLabel overrides the default loading copy', async () => {
  await render(
    <Button onPress={() => {}} loading loadingLabel="Sending…">
      Email me a code
    </Button>,
  );
  expect(screen.getByRole('button', { name: 'Sending…' })).toBeTruthy();
});

test('disabled buttons are announced as disabled and ignore presses', async () => {
  const onPress = jest.fn();
  await render(
    <Button onPress={onPress} disabled>
      Continue
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Continue' });
  expect(button).toBeDisabled();
  await fireEvent.press(button);
  expect(onPress).not.toHaveBeenCalled();
});

describe('one filled button per screen (UX-26)', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  test('warns when two primaries mount at once', async () => {
    await render(
      <PrimaryScope>
        <Button onPress={() => {}}>Save this look</Button>
        <Button onPress={() => {}}>Build this look</Button>
      </PrimaryScope>,
    );
    expect(warn).toHaveBeenCalledWith(DOUBLE_PRIMARY_WARNING);
  });

  test('stays quiet for one primary plus secondaries', async () => {
    await render(
      <PrimaryScope>
        <Button onPress={() => {}}>Save this look</Button>
        <Button variant="secondary" onPress={() => {}}>
          Wear on a day
        </Button>
      </PrimaryScope>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  test('scopes are independent, so screens kept mounted in a stack don’t trip it', async () => {
    await render(
      <>
        <PrimaryScope>
          <Button onPress={() => {}}>Continue</Button>
        </PrimaryScope>
        <PrimaryScope>
          <Button onPress={() => {}}>Save this look</Button>
        </PrimaryScope>
      </>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  test('unmounting a primary frees the slot', async () => {
    const { rerender } = await render(
      <PrimaryScope>
        <Button onPress={() => {}}>Continue</Button>
      </PrimaryScope>,
    );
    await rerender(
      <PrimaryScope>
        <Button variant="secondary" onPress={() => {}}>
          Continue
        </Button>
        <Button onPress={() => {}}>Save this look</Button>
      </PrimaryScope>,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});

test('IconButton exposes its required label and a 44pt hit area', async () => {
  const onPress = jest.fn();
  await render(<IconButton icon="close" label="Close" onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'Close' });
  expect(button).toHaveStyle({ minWidth: 44, minHeight: 44 });
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});
