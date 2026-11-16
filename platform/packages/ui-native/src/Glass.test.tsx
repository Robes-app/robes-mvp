import { render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';
import { Glass } from './Glass';

jest.mock('expo-glass-effect', () => {
  const { createElement } = require('react');
  const { View } = require('react-native');
  return {
    GlassView: (props: object) => createElement(View, { ...props, testID: 'liquid-glass' }),
    isGlassEffectAPIAvailable: () => true,
    isLiquidGlassAvailable: () => true,
  };
});

afterEach(() => jest.restoreAllMocks());

test('on an iOS that draws it, the veil is Liquid Glass under its children', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(false);
  await render(
    <Glass className="rounded-pill">
      <Text>Back</Text>
    </Glass>,
  );
  expect(screen.getByTestId('liquid-glass')).toBeTruthy();
  expect(screen.getByText('Back')).toBeTruthy();
});

test('with Reduce Transparency on, the veil stays the cream token and no glass is drawn', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceTransparencyEnabled').mockResolvedValue(true);
  await render(
    <Glass>
      <Text>Back</Text>
    </Glass>,
  );
  await waitFor(() => expect(screen.queryByTestId('liquid-glass')).toBeNull());
  expect(screen.getByText('Back')).toBeTruthy();
});
