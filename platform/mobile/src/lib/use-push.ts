import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { api } from './api';
import { nativePath } from './links';
import { refreshPush } from './push';

// Foreground notifications show as banners too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Payloads come from outside the app; read them defensively.
export function urlOf(
  response: Notifications.NotificationResponse | null | undefined,
): string | null {
  const url = (
    response as
      | { notification?: { request?: { content?: { data?: { url?: unknown } } } } }
      | null
      | undefined
  )?.notification?.request?.content?.data?.url;
  return typeof url === 'string' ? url : null;
}

// Signed-in shell: keep this device registered and open the screen a tapped notification names.
export function usePush(): void {
  const router = useRouter();
  useEffect(() => {
    void refreshPush(api).catch(() => undefined);
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = urlOf(response);
      if (url) router.push(nativePath(url) as never);
    };
    void Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [router]);
}

// Mounted only inside the signed-in shell.
export function PushSetup(): null {
  usePush();
  return null;
}
