import { render } from '@testing-library/react-native';
import { WarmGround } from './WarmGround';

let mockTheme = 'light';
jest.mock('uniwind', () => ({ useUniwind: () => ({ theme: mockTheme }) }));

describe('WarmGround', () => {
  test('paints the warm ground in light mode', async () => {
    mockTheme = 'light';
    const { toJSON } = await render(<WarmGround />);
    expect(toJSON()).not.toBeNull();
  });

  test('leaves the plain ground in dark mode', async () => {
    mockTheme = 'dark';
    const { toJSON } = await render(<WarmGround />);
    expect(toJSON()).toBeNull();
  });
});
