import { useApiClient } from '@robes/api-client/react';
import { compareVersions } from '@robes/contracts';
import { shell } from '@robes/copy';
import { AlertDialog, useToast } from '@robes/ui-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSegments } from 'expo-router';
import { type ReactElement, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { nativeAnalytics } from './analytics';
import { authClient } from './auth-client';
import { APP_VERSION, UPDATE_URL } from './config';
import { readPref, writePref } from './prefs';
import { onSessionEvent } from './session-events';

const NUDGED = 'robes.update-nudged';
const openUpdate = () => void Linking.openURL(UPDATE_URL);

// Audit F6, links opened while signed out. Any screen but sign-in itself sends her to sign-in when
// there is no session, carrying where she was going (`next`), so a look, a piece or a day opens
// once she's in. A 401 from the server (the session gone) signs her out cleanly and does the
// same. A 426 (this app below the minimum app version, ADR-022) holds the update screen for good:
// one button, no way past, asked at launch through the public versions route and again on any
// request. Below the latest app version, a toast offers the update once per version. If the
// versions can't be fetched she gets in, and the first 426 still stops her. The tabs keep their
// own gate (onboarding, Home).
export function SessionGate(): ReactElement {
  const session = authClient.useSession();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const api = useApiClient();
  const toast = useToast();
  const [upgrade, setUpgrade] = useState(false);
  // Its 426, like any query's, reaches onSessionEvent through the query cache.
  const versions = useQuery({
    queryKey: ['public.appVersions'],
    queryFn: () => api.call('public.appVersions'),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const latest = versions.data?.latest;
  const where = useRef(pathname);
  where.current = pathname;
  const outside = segments[0] === '(auth)' || segments[0] === '(tabs)' || pathname === '/';

  useEffect(() => {
    if (session.isPending || session.data || outside) return;
    router.replace({ pathname: '/sign-in', params: { next: pathname } });
  }, [session.isPending, session.data, outside, pathname, router]);

  useEffect(() => {
    if (!latest || compareVersions(APP_VERSION, latest) >= 0) return;
    void readPref(NUDGED).then((seen) => {
      if (seen === latest) return;
      void writePref(NUDGED, latest);
      toast.show({
        message: shell.update.ready,
        action: { label: shell.update.action, onPress: openUpdate },
      });
    });
  }, [latest, toast]);

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
              next && next !== '/' && !next.startsWith('/sign-in') && !next.startsWith('/sign-up')
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
      actions={[{ label: shell.update.action, variant: 'primary', onPress: openUpdate }]}
      // No way past: an app below the minimum gets nothing but 426 from the server.
      onDismiss={() => undefined}
      testID="update-ask"
    />
  );
}
