import { render, screen } from '@testing-library/react-native';
import { maxFontSizeMultiplier } from './scale';
import { Em, Eyebrow, Heading, Text } from './Text';

test('Heading is a header in Cormorant and never below 17pt', async () => {
  await render(
    <>
      <Heading>Sign in.</Heading>
      <Heading style={{ fontSize: 12 }}>Too small.</Heading>
      <Heading size="sm" weight="regular">
        Smallest.
      </Heading>
    </>,
  );
  const [first, clamped, smallest] = screen.getAllByRole('header');
  expect(first).toHaveStyle({ fontFamily: 'Cormorant_300Light', fontSize: 36 });
  expect(clamped).toHaveStyle({ fontSize: 17 });
  expect(smallest).toHaveStyle({ fontFamily: 'Cormorant_400Regular', fontSize: 17 });
});

test('text scales with Dynamic Type up to the shared caps', async () => {
  await render(
    <>
      <Text>Body</Text>
      <Heading>Title.</Heading>
      <Eyebrow>Welcome</Eyebrow>
    </>,
  );
  expect(screen.getByText('Body').props.maxFontSizeMultiplier).toBe(maxFontSizeMultiplier.body);
  expect(screen.getByText('Title.').props.maxFontSizeMultiplier).toBe(
    maxFontSizeMultiplier.heading,
  );
  expect(screen.getByText('Welcome').props.maxFontSizeMultiplier).toBe(maxFontSizeMultiplier.label);
  expect(screen.getByText('Body').props.allowFontScaling).not.toBe(false);
});

test('Text uses the Inter family by weight', async () => {
  await render(
    <>
      <Text>Regular</Text>
      <Text weight="medium">Medium</Text>
    </>,
  );
  expect(screen.getByText('Regular')).toHaveStyle({ fontFamily: 'Inter_300Light' });
  expect(screen.getByText('Medium')).toHaveStyle({ fontFamily: 'Inter_500Medium' });
});

test('an italic line is Cormorant italic, never the sans, and never below 17pt', async () => {
  await render(
    <>
      <Text size="caption" italic>
        Awaiting
      </Text>
      <Heading>
        What should Robes <Em>call you?</Em>
      </Heading>
    </>,
  );
  expect(screen.getByText('Awaiting')).toHaveStyle({
    fontFamily: 'Cormorant_300Light_Italic',
    fontSize: 17,
  });
  expect(screen.getByText('call you?')).toHaveStyle({ fontFamily: 'Cormorant_300Light_Italic' });
});

test('a font-display class sets the serif, which the inline sans would otherwise beat', async () => {
  await render(
    <>
      <Text className="font-display text-xl">Light Spring</Text>
      <Text className="text-display-ish">Sans</Text>
    </>,
  );
  expect(screen.getByText('Light Spring')).toHaveStyle({ fontFamily: 'Cormorant_300Light' });
  expect(screen.getByText('Sans')).toHaveStyle({ fontFamily: 'Inter_300Light' });
});
