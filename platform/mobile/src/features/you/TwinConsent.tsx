import { consent, twin } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import {
  Button,
  ErrorText,
  Eyebrow,
  Heading,
  PrimaryScope,
  Text,
  useColor,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LEGAL_URLS } from '@/lib/config';
import { useConsents } from '@/lib/consents';
import { SettingsGroup } from './Settings';

const copy = twin.twinPage.consent;

// Her yes before the selfie camera (Annie's "Digital twin consent" artboard, 11 Nov; App Store
// 5.1.2): what is collected, that Google Gemini makes the picture, and a box she ticks herself.
// The yes is saved as `photo_analysis`, and the route shows the camera once it is on her account.
// Web twin: app/src/app/(app)/you/selfie/twin-consent.tsx.
export function TwinConsent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [agreed, setAgreed] = useState(false);
  const { give, saving, error } = useConsents();

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/you/model');
  };

  return (
    <PrimaryScope>
      <View
        className="flex-1 bg-bg"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        testID="twin-consent"
      >
        <ScrollView contentContainerClassName="gap-5 px-5 pt-8 pb-6">
          <View className="gap-1">
            <Eyebrow className="mb-2 text-accent-warm">{copy.eyebrow}</Eyebrow>
            <Heading size="lg">{copy.title}</Heading>
            <Text italic tone="muted">
              {copy.sub}
            </Text>
          </View>
          <ConsentRows rows={copy.rows} />
          <AgreeBox
            agreed={agreed}
            label={copy.agree}
            onToggle={() => setAgreed((a) => !a)}
            onPrivacy={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
          />
          {error ? <ErrorText>{consent.failed}</ErrorText> : null}
        </ScrollView>
        <View
          className="flex-row gap-2 border-hairline px-5 pt-3 pb-4"
          style={{ borderTopWidth: 0.5 }}
        >
          <View className="flex-1">
            <Button variant="outline" onPress={close}>
              {copy.notNow}
            </Button>
          </View>
          <View className="flex-[2]">
            <Button
              disabled={!agreed}
              loading={saving}
              onPress={() => give({ photo_analysis: true }, { wait: true })}
            >
              {copy.go}
            </Button>
          </View>
        </View>
      </View>
    </PrimaryScope>
  );
}

// What the twin collects, uses and keeps, one row each (shared with Getting to know you's
// Privacy sheet, which names the close-up only).
export function ConsentRows({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <SettingsGroup>
      {rows.map(([label, value], i) => (
        <View
          key={label}
          className="gap-1 border-hairline px-3.5 py-2.5"
          style={{ borderTopWidth: i === 0 ? 0 : 0.5 }}
        >
          <Eyebrow>{label}</Eyebrow>
          <Text size="small">{value}</Text>
        </View>
      ))}
    </SettingsGroup>
  );
}

// The box she ticks herself, its line ending on Privacy (App Store 5.1.2).
export function AgreeBox({
  agreed,
  label,
  onToggle,
  onPrivacy,
}: {
  agreed: boolean;
  label: string;
  onToggle: () => void;
  onPrivacy: () => void;
}) {
  const ink = useColor('ink');
  const bg = useColor('bg');
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: agreed }}
      accessibilityLabel={label}
      onPress={onToggle}
      className="min-h-11 flex-row items-start gap-2.5"
      testID="twin-consent-agree"
    >
      <View
        className="size-5 items-center justify-center rounded-xs border border-border-control bg-surface-raised"
        style={agreed ? { backgroundColor: ink, borderColor: ink } : undefined}
      >
        {agreed ? <Icon name="check" size={12} color={bg} /> : null}
      </View>
      <Text size="small" tone="muted" className="flex-1">
        {label}{' '}
        <Text
          size="small"
          tone="faint"
          accessibilityRole="link"
          className="underline"
          onPress={onPrivacy}
        >
          {copy.privacy}
        </Text>
      </Text>
    </Pressable>
  );
}
