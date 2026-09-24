import { render, screen } from '@testing-library/react-native';
import Home from '../src/app/index';

test('home renders the brand line', async () => {
  await render(<Home />);
  expect(screen.getByText('Your wardrobe, styled.')).toBeTruthy();
});
