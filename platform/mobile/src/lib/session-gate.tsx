import { shell } from '@robes/copy';
import { AlertDialog } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { nativeAnalytics } from './analytics';
import { authClient } from './auth-client';
import { UPDATE_URL } from './config';
import { onSessionEvent } from './session-events';

// Audit F6, links opened while signed out. Any screen but sign-in itself sends her to sign-in when
// there is no session, carrying where she was going (`next`), so a look, a piece or a day opens
// once she's in. A 401 from the server (the session gone) signs her out cleanly and does the
// same; a 426 (this app too old for the server) offers the store, never a dead end. The tabs keep
// their own gate (onboarding, Home).
export function SessionGate(): ReactElement {
  const session = authClient.useSession();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [upgrade, setUpgrade] = useState(false);
  const where = useRef(pathname);
  where.current = pathname;
  const outside = segments[0] === '(auth)' || segments[0] === '(tabs)' || pathname === '/';

  useEffect(() => {
    if (session.isPending || session.data || outside) return;
    router.replace({ pathname: '/sign-in', params: { next: pathname } });
  }, [session.isPending, session.data, outside, pathname, router]);

  useEffect(
    () =>
      onSessionEvent((event) => {
        if (event === 'upgrade') return setUpgrade(true);
        // The session is already gone on the server: forget it here, then sign-in, then back.
        const next = where.current;
        void authClient
          .signOut()
          .catch(() => undefined)
          .finally(() => {
            nativeAnalytics.stop();
            queryClient.clear();
            router.replace(
              next && next !== '/' && !next.startsWith('/sign-in')
                ? { pathname: '/sign-in', params: { next } }
                : '/sign-in',
            );
          });
      }),
    [queryClient, router],
  );

  return (
    <AlertDialog
      open={upgrade}
      title={shell.update.title}
      actions={[
        {
          label: shell.update.action,
          variant: 'primary',
          onPress: () => {
            setUpgrade(false);
            void Linking.openURL(UPDATE_URL);
          },
        },
        { label: shell.update.later, variant: 'outline', onPress: () => setUpgrade(false) },
      ]}
      onDismiss={() => setUpgrade(false)}
      testID="update-ask"
    />
  );
}
