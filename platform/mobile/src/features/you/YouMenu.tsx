import { useApi } from '@robes/api-client/react';
import type { Observation } from '@robes/contracts';
import { you as copy, twin } from '@robes/copy';
import { asSentence } from '@robes/core';
import { Icon } from '@robes/icons/native';
import { Button, Eyebrow, fonts, SegmentedControl, Text, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { API_URL } from '@/lib/config';
import { useSignOut } from '@/lib/use-sign-out';
import { useBriefRead } from './dna';
import { NotificationRows } from './Notifications';
import { ObservationThumbs } from './ObservationThumbs';
import { SettingsGroup, SettingsRow } from './Settings';

// Legal pages are served by the web app, which shares the API origin.
export const LEGAL_URLS = { terms: `${API_URL}/legal/terms`, privacy: `${API_URL}/legal/privacy` };

type Tab = 'style' | 'account';

// The avatar's door (legacy Settings, 2026-10-08 redlines): the stack's header reads Settings,
// then Style Profile | Account; Account prints her answers on white rows. Web twin:
// app/src/app/(app)/you/page.tsx.
export function YouMenu({ initialTab = 'style' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <ScrollView contentContainerClassName="gap-[26px] px-6 pt-6 pb-12">
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

// A landing card prints its title only (redlines G4/L5): white on a hairline, the card the door.
function Card({ label, onPress }: { label: string; onPress: () => void }) {
  const faint = useColor('ink-faint');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-row items-center justify-between gap-4 rounded-soft border border-hairline bg-surface-raised px-[22px] py-5"
    >
      <Text style={{ fontFamily: fonts.displayRegular, fontSize: 24 }}>{label}</Text>
      <Icon name="forward" color={faint} size={16} />
    </Pressable>
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
      <Card label={twin.cards.twin} onPress={() => router.push('/you/model')} />
      <Card label={twin.cards.dna} onPress={() => router.push('/you/style')} />
      <Card label={twin.cards.observations} onPress={() => router.push('/you/observations')} />
    </View>
  );
}

// The first waiting line, answered with That’s right or Not quite.
function NoticedCard({ line }: { line: Observation }) {
  return (
    <View
      className="gap-2.5 rounded-soft border border-rule-mid bg-surface-raised px-[22px] pt-5 pb-[18px]"
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

function Account() {
  const router = useRouter();
  const signOut = useSignOut();
  const { data: me } = useApi('me.get');
  const name = [me?.firstName, me?.lastName].filter(Boolean).join(' ');
  return (
    <View className="gap-[26px]">
      <SettingsGroup title={copy.sections.profile}>
        <SettingsRow
          first
          label={copy.account.name}
          value={me ? name || twin.dnaPage.notYet : ''}
          empty={!!me && !name}
          onPress={() => router.push('/you/account')}
        />
        <SettingsRow label={copy.account.email} value={me?.email ?? ''} />
        <SettingsRow
          label={copy.deletion.title}
          tone="danger"
          onPress={() => router.push('/you/delete')}
        />
      </SettingsGroup>
      <SettingsGroup title={copy.sections.notifications}>
        <NotificationRows />
        <SettingsRow
          label={copy.receipts.title}
          sub={copy.subs.receipts}
          onPress={() => router.push('/you/receipts')}
        />
      </SettingsGroup>
      <SettingsGroup title={copy.sections.privacy}>
        <SettingsRow first label={copy.privacy} onPress={() => router.push('/you/privacy')} />
        <SettingsRow
          label={copy.legal.privacyNotice}
          sub={copy.subs.privacy}
          external
          onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
        />
        <SettingsRow
          label={copy.legal.terms}
          sub={copy.subs.terms}
          external
          onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
        />
      </SettingsGroup>
      <View className="items-center gap-2.5">
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(`mailto:${copy.helpEmail}`)}
        >
          <Text size="small" tone="muted">
            {`${copy.help} `}
            <Text size="small" className="underline">
              {copy.helpEmail}
            </Text>
          </Text>
        </Pressable>
        <Eyebrow>{copy.version}</Eyebrow>
        <Button variant="secondary" onPress={() => void signOut()}>
          {copy.signOut}
        </Button>
      </View>
    </View>
  );
}
