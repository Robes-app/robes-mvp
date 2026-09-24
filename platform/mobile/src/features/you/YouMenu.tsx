import { useApi } from '@robes/api-client/react';
import { you as copy } from '@robes/copy';
import { Avatar, Button, Heading, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, View } from 'react-native';
import { API_URL } from '@/lib/config';
import { useSignOut } from '@/lib/use-sign-out';
import { Row } from './Row';

// Legal pages are served by the web app, which shares the API origin.
export const LEGAL_URLS = { terms: `${API_URL}/legal/terms`, privacy: `${API_URL}/legal/privacy` };

export function YouMenu() {
  const router = useRouter();
  const signOut = useSignOut();
  const { data: me } = useApi('me.get');
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      <View className="flex-row items-center gap-4">
        <Avatar name={me?.firstName ?? me?.email ?? null} size="lg" />
        <View className="flex-1 gap-1">
          <Heading size="md">{me?.firstName ?? copy.title}</Heading>
          {me ? (
            <Text size="small" tone="muted">
              {me.email}
            </Text>
          ) : null}
        </View>
      </View>
      <View>
        <Row label={copy.account.title} onPress={() => router.push('/you/account')} />
        <Row label={copy.notifications.title} onPress={() => router.push('/you/notifications')} />
        <Row label={copy.privacy} onPress={() => router.push('/you/privacy')} />
        <Row
          label={copy.legal.terms}
          onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
        />
        <Row
          label={copy.legal.privacyNotice}
          onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
        />
        <Row label={copy.deletion.title} tone="danger" onPress={() => router.push('/you/delete')} />
      </View>
      <Button variant="secondary" onPress={() => void signOut()}>
        {copy.signOut}
      </Button>
    </ScrollView>
  );
}
