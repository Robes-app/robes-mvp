import { ApiClientProvider } from '@robes/api-client/react';
import { shell, ui, wardrobe } from '@robes/copy';
import { ToastProvider } from '@robes/ui-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootLayout from '../src/app/_layout';
import Create from '../src/app/create';
import AddPiecesSheet from '../src/app/wardrobe/add';
import { FORM_SHEET } from '../src/components/FormSheetScreen';
import { api } from '../src/lib/api';
import { ME, mockFetch, newQueryClient } from './support/api';
import { mockRouter } from './support/router';

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
jest.mock('../src/lib/auth-client', () => ({ authClient: { getCookie: () => null } }));

test('Create and Add pieces pull up as the same sheet', async () => {
  await render(<RootLayout />);
  const options = (name: string) => mockScreens.find((s) => s.name === name)?.options;
  expect(options('create')).toBe(FORM_SHEET);
  expect(options('wardrobe/add')).toBe(FORM_SHEET);
  expect(FORM_SHEET).toEqual(
    expect.objectContaining({ presentation: 'formSheet', sheetGrabberVisible: false }),
  );
});

// One head: the title centred, × to close, the body clear of the home indicator.
test.each([
  ['Create', () => <Create />, shell.create.title],
  ['Add pieces', () => <AddPiecesSheet />, wardrobe.add.title],
])('%s has the sheet head', async (_, Screen, title) => {
  mockFetch({ 'GET /me': ME, 'GET /me/features': { trips: false } });
  mockRouter.back.mockClear();
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <QueryClientProvider client={newQueryClient()}>
        <ApiClientProvider client={api}>
          <ToastProvider>
            <Screen />
          </ToastProvider>
        </ApiClientProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  const heading = await screen.findByRole('header', { name: title });
  let frame = heading.parent;
  while (frame?.parent && StyleSheet.flatten(frame.props.style)?.paddingBottom === undefined) {
    frame = frame.parent;
  }
  expect(StyleSheet.flatten(frame?.props.style)).toEqual(
    expect.objectContaining({ paddingBottom: 34 }),
  );
  await fireEvent.press(screen.getByRole('button', { name: ui.close }));
  expect(mockRouter.back).toHaveBeenCalled();
});
