import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import RootLayout from '../src/app/_layout';
import { DRAFT_SHEET } from '../src/components/FormSheetScreen';

const mockScreens: Array<{ name: string; options?: unknown }> = [];
jest.mock('expo-router', () => {
  const Stack = ({ children }: { children?: ReactNode }) => children ?? null;
  Stack.Screen = (props: { name: string; options?: unknown }) => {
    mockScreens.push(props);
    return null;
  };
  return { ...jest.requireActual('./support/router').mockRouterModule, Stack };
});
jest.mock('../src/global.css', () => ({}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('../src/lib/auth-client', () => ({
  authClient: {
    getCookie: () => null,
    useSession: () => ({ isPending: false, data: { user: { id: 'u' } } }),
  },
}));

// The draft rises as a native sheet at full height; Add pieces is never a route sheet: the old
// address redirects to the glass sheet over the Wardrobe (addPiecesHref).
test('the draft pulls up as a sheet, Add pieces does not', async () => {
  await render(<RootLayout />);
  const options = (name: string) => mockScreens.find((s) => s.name === name)?.options;
  expect(options('looks/draft/[id]')).toBe(DRAFT_SHEET);
  expect(DRAFT_SHEET).toEqual(
    expect.objectContaining({
      presentation: 'formSheet',
      sheetGrabberVisible: false,
      sheetAllowedDetents: [1],
    }),
  );
  expect(options('wardrobe/add')).toBeUndefined();
});
