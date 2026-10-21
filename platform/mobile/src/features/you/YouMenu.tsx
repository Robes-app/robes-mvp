import { useApi } from '@robes/api-client/react';
import type { Observation } from '@robes/contracts';
import { you as copy, twin } from '@robes/copy';
import { Avatar, Button, Eyebrow, Heading, SegmentedControl, Text } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { API_URL } from '@/lib/config';
import { useSignOut } from '@/lib/use-sign-out';
import { useBriefRead, useDnaMutations } from './dna';
import { Row } from './Row';

// Legal pages are served by the web app, which shares the API origin.
export const LEGAL_URLS = { terms: `${API_URL}/legal/terms`, privacy: `${API_URL}/legal/privacy` };

type Tab = 'style' | 'account';

// The avatar's door (legacy Settings): Style Profile | Account.
export function YouMenu({ initialTab = 'style' }: { initialTab?: Tab }) {
  const { data: me } = useApi('me.get');
  const [tab, setTab] = useState<Tab>(initialTab);
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
      <SegmentedControl
        label={twin.tabs.label}
        value={tab}
        options={[
          { value: 'style', label: twin.tabs.style },
          { value: 'account', label: twin.tabs.account },
        ]}
        onChange={setTab}
      />
      {tab === 'style' ? <StyleProfile /> : <Account />}
    </ScrollView>
  );
}

function StyleProfile() {
  const router = useRouter();
  const { data: dna } = useApi('me.dna.get');
  useBriefRead(dna);
  const first = dna?.observations[0];
  return (
    <View className="gap-4">
      {first ? <NoticedCard line={first} /> : null}
      <View>
        <Row label={twin.cards.twin} onPress={() => router.push('/you/model')} />
        <Row label={twin.cards.dna} onPress={() => router.push('/you/style')} />
        <Row label={twin.cards.observations} onPress={() => router.push('/you/observations')} />
      </View>
    </View>
  );
}

// The first waiting line, answered with Keep or Not me.
function NoticedCard({ line }: { line: Observation }) {
  const { keep, dismiss } = useDnaMutations();
  const busy = keep.isPending || dismiss.isPending;
  return (
    <View className="gap-3 rounded-crisp border border-hairline bg-surface p-5" testID="noticed">
      <Eyebrow>{twin.noticed.eyebrow}</Eyebrow>
      <Text className="font-serif text-xl">{line.text}</Text>
      {line.because ? (
        <Text size="small" tone="muted" italic>
          {line.because}
        </Text>
      ) : null}
      <View className="flex-row justify-between gap-3">
        <Button
          variant="quiet"
          disabled={busy}
          onPress={() => dismiss.mutate({ params: { id: line.id } })}
        >
          {twin.noticed.notMe}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onPress={() => keep.mutate({ params: { id: line.id } })}
        >
          {twin.noticed.keep}
        </Button>
      </View>
    </View>
  );
}

function Account() {
  const router = useRouter();
  const signOut = useSignOut();
  return (
    <View className="gap-6">
      <View>
        <Row label={copy.account.title} onPress={() => router.push('/you/account')} />
        <Row label={copy.notifications.title} onPress={() => router.push('/you/notifications')} />
        <Row label={copy.receipts.title} onPress={() => router.push('/you/receipts')} />
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
    </View>
  );
}
