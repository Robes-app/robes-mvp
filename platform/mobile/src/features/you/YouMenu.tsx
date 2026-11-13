import { useApi } from '@robes/api-client/react';
import type { Observation } from '@robes/contracts';
import { twin, you } from '@robes/copy';
import { asSentence } from '@robes/core';
import { Icon } from '@robes/icons/native';
import {
  Button,
  DrillList,
  DrillRow,
  Eyebrow,
  fonts,
  Tabs,
  Text,
  useColor,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useNotifications } from '@/components/Bell';
import { LEGAL_URLS } from '@/lib/config';
import { useSignOut } from '@/lib/use-sign-out';
import { useBriefRead } from './dna';
import { ObservationThumbs } from './ObservationThumbs';

type Tab = 'style' | 'account';

// The avatar's door (Felix SettingsView): under the subview header (app/you/index.tsx), Style
// profile · Account as underline Tabs, each tab one drill card. Web twin:
// app/src/app/(app)/you/page.tsx.
export function YouMenu({ initialTab = 'style' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <ScrollView contentContainerClassName="px-5 pt-1.5 pb-12">
      <Tabs
        items={[twin.tabs.style, twin.tabs.account]}
        value={tab === 'style' ? twin.tabs.style : twin.tabs.account}
        onChange={(item) => setTab(item === twin.tabs.account ? 'account' : 'style')}
      />
      <View className="mt-4">{tab === 'style' ? <StyleProfile /> : <Account />}</View>
    </ScrollView>
  );
}

function StyleProfile() {
  const router = useRouter();
  const { data: dna } = useApi('me.dna.get');
  useBriefRead(dna);
  const first = dna?.observations[0];
  return (
    <View className="gap-3.5">
      {first ? <NoticedCard line={first} /> : null}
      <DrillList>
        <DrillRow first label={twin.cards.twin} onPress={() => router.push('/you/model')} />
        <DrillRow label={twin.cards.dna} onPress={() => router.push('/you/style')} />
        <DrillRow
          label={twin.cards.observations}
          onPress={() => router.push('/you/observations')}
        />
      </DrillList>
    </View>
  );
}

// The first waiting line, answered with That’s right or Not quite.
function NoticedCard({ line }: { line: Observation }) {
  return (
    <View
      className="gap-2.5 rounded-card border border-rule-mid bg-surface-raised px-[22px] pt-5 pb-[18px]"
      testID="noticed"
    >
      <Eyebrow className="text-accent-plan">{twin.noticed.eyebrow}</Eyebrow>
      <Text numberOfLines={3} style={{ fontFamily: fonts.displayRegular, fontSize: 22 }}>
        {asSentence(line.text)}
      </Text>
      {line.because ? (
        <Text size="small" tone="muted" italic>
          {asSentence(line.because)}
        </Text>
      ) : null}
      <ObservationThumbs line={line} />
    </View>
  );
}

// Account: one drill card holding every row the tab had before (Annie, 7 Nov) — the screens behind
// them keep their routes — then Sign out, the outline button 24pt under it. Notifications carries
// "2 new" while anything waits behind the bell.
function Account() {
  const router = useRouter();
  const signOut = useSignOut();
  const faint = useColor('ink-faint');
  const { data: me } = useApi('me.get');
  const waiting = useNotifications().data?.items.length ?? 0;
  const name = [me?.firstName, me?.lastName].filter(Boolean).join(' ');
  const external = <Icon name="external" size={14} color={faint} />;
  return (
    <View className="gap-6">
      <DrillList testID="account-rows">
        <DrillRow
          first
          label={you.rows.details}
          {...(me ? { value: name || twin.dnaPage.notYet, muted: !name } : {})}
          onPress={() => router.push('/you/account')}
        />
        <DrillRow label={you.account.email} {...(me ? { value: me.email } : {})} />
        <DrillRow
          label={you.rows.notifications}
          {...(waiting ? { value: you.rows.newAlerts(waiting) } : {})}
          onPress={() => router.push('/you/notifications')}
        />
        <DrillRow label={you.rows.receipts} onPress={() => router.push('/you/receipts')} />
        <DrillRow label={you.rows.privacy} onPress={() => router.push('/you/privacy')} />
        <DrillRow
          label={you.legal.privacyNotice}
          accessibilityRole="link"
          trailing={external}
          onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
        />
        <DrillRow
          label={you.legal.terms}
          accessibilityRole="link"
          trailing={external}
          onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
        />
        <DrillRow
          label={you.rows.help}
          value={you.helpEmail}
          accessibilityRole="link"
          onPress={() => void Linking.openURL(`mailto:${you.helpEmail}`)}
        />
        <DrillRow label={you.deletion.title} onPress={() => router.push('/you/delete')} />
      </DrillList>
      <Button variant="outline" className="w-full" onPress={() => void signOut()}>
        {you.signOut}
      </Button>
    </View>
  );
}
