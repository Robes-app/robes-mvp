import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Text } from 'react-native';
import { Avatar, initials } from './Avatar';
import { Card, CardSkeleton } from './Card';
import { EmptyState } from './EmptyState';
import { Image } from './Image';
import { Progress } from './Progress';
import { Skeleton } from './Skeleton';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('expo-image', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return { Image: (props: object) => createElement(View, { ...props, testID: 'expo-image' }) };
});

afterEach(() => jest.restoreAllMocks());

describe('Image', () => {
  test('keeps a fixed aspect frame and labels meaningful images', async () => {
    await render(
      <Image source="https://cdn.test/p.jpg" alt="Cream knit" aspect="1:1" blurhash="LKO2" />,
    );
    const frame = screen.getByRole('image', { name: 'Cream knit' });
    expect(frame).toHaveStyle({ aspectRatio: 1 });
  });

  test('passes the blurhash placeholder to expo-image', async () => {
    await render(<Image source="https://cdn.test/p.jpg" alt="" blurhash="LKO2" />);
    const img = screen.getByTestId('expo-image', { includeHiddenElements: true });
    expect(img.props.placeholder).toEqual({ blurhash: 'LKO2' });
    expect(img.props.source).toEqual({ uri: 'https://cdn.test/p.jpg' });
  });

  test('an empty alt hides decorative images from assistive tech', async () => {
    await render(<Image source="https://cdn.test/p.jpg" alt="" testID="img" />);
    expect(screen.queryByRole('image')).toBeNull();
    const frame = screen.getByTestId('img', { includeHiddenElements: true });
    expect(frame).toHaveStyle({ aspectRatio: 4 / 5 });
    expect(frame).not.toBeVisible();
  });
});

describe('Card', () => {
  test('is a button only when pressable', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <Card>
          <Text>Static</Text>
        </Card>
        <Card onPress={onPress} accessibilityLabel="Open look">
          <Text>Look</Text>
        </Card>
      </>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Open look' }));
    expect(onPress).toHaveBeenCalled();
  });

  test('skeleton twin announces loading once and hides its shapes', async () => {
    await render(<CardSkeleton testID="sk" />);
    const sk = screen.getByTestId('sk');
    expect(sk).toBeBusy();
    expect(sk.props.accessibilityLabel).toBe('One moment…');
  });
});

describe('Skeleton', () => {
  function spyLoop() {
    const pulse = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
    jest.spyOn(Animated, 'loop').mockReturnValue(pulse);
    return pulse;
  }

  test('pulses by default', async () => {
    const pulse = spyLoop();
    await render(<Skeleton width={40} height={40} />);
    await act(async () => {});
    expect(pulse.start).toHaveBeenCalled();
    expect(pulse.stop).not.toHaveBeenCalled();
  });

  test('stops pulsing once reduce motion is known to be on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const pulse = spyLoop();
    await render(<Skeleton width={40} height={40} />);
    await act(async () => {});
    expect(pulse.stop).toHaveBeenCalledTimes(pulse.start.mock.calls.length);
  });
});

describe('Progress', () => {
  test('shows the staged copy by default', async () => {
    await render(<Progress />);
    expect(screen.getByRole('progressbar', { name: 'Styling your pieces…' })).toBeTruthy();
  });

  test('reports per-image fill as a value', async () => {
    await render(<Progress stage="Working on it…" total={3} done={1} />);
    const bar = screen.getByRole('progressbar', { name: 'Working on it…' });
    expect(bar.props.accessibilityValue).toEqual({
      min: 0,
      max: 3,
      now: 1,
      text: '1 of 3 images ready',
    });
    expect(bar).toBeBusy();
  });

  test('is no longer busy when every image is in', async () => {
    await render(<Progress total={2} done={5} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.props.accessibilityValue.now).toBe(2);
    expect(bar).not.toBeBusy();
  });
});

describe('EmptyState', () => {
  test('has a title, body and one secondary action', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState
        title="Left free."
        body="Add a piece and Robes will dress it three ways."
        action={{ label: 'Add a piece', onPress }}
      />,
    );
    expect(screen.getByRole('header', { name: 'Left free.' })).toBeTruthy();
    const button = screen.getByRole('button', { name: 'Add a piece' });
    expect(button.props.className ?? '').not.toContain('bg-ink');
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Avatar', () => {
  test('falls back to initials and is labelled with her name', async () => {
    await render(<Avatar name="Ann Byrne" />);
    expect(screen.getByRole('image', { name: 'Ann Byrne' })).toBeTruthy();
    expect(screen.getByText('AB')).toBeTruthy();
  });

  test('renders a photo when given one', async () => {
    await render(<Avatar name="Ann" source="https://cdn.test/a.jpg" />);
    expect(screen.getByTestId('expo-image').props.source).toEqual({
      uri: 'https://cdn.test/a.jpg',
    });
    expect(screen.queryByText('A')).toBeNull();
  });

  test('initials handles empty and single names', () => {
    expect(initials(null)).toBe('');
    expect(initials('  ann ')).toBe('A');
  });
});
