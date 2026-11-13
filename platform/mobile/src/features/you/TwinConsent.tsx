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
  const ink = useColor('ink');
  const bg = useColor('bg');
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
            <Heading size="xl">{copy.title}</Heading>
            <Text italic tone="muted">
              {copy.sub}
            </Text>
          </View>
          <SettingsGroup>
            {copy.rows.map(([label, value], i) => (
              <View
                key={label}
                className="gap-1 border-rule px-3.5 py-2.5"
                style={{ borderTopWidth: i === 0 ? 0 : 0.5 }}
              >
                <Eyebrow>{label}</Eyebrow>
                <Text size="small">{value}</Text>
              </View>
            ))}
          </SettingsGroup>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            accessibilityLabel={copy.agree}
            onPress={() => setAgreed((a) => !a)}
            className="min-h-11 flex-row items-start gap-2.5"
            testID="twin-consent-agree"
          >
            <View
              className="mt-0.5 size-[18px] items-center justify-center rounded-xs border border-border-control"
              style={agreed ? { backgroundColor: ink, borderColor: ink } : undefined}
            >
              {agreed ? <Icon name="check" size={12} color={bg} /> : null}
            </View>
            <Text size="small" tone="muted" className="flex-1">
              {copy.agree}{' '}
              <Text
                size="small"
                tone="muted"
                accessibilityRole="link"
                className="underline"
                onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacy)}
              >
                {copy.privacy}
              </Text>
            </Text>
          </Pressable>
          {error ? <ErrorText>{consent.failed}</ErrorText> : null}
        </ScrollView>
        <View className="flex-row gap-2 border-rule px-5 pt-3 pb-4" style={{ borderTopWidth: 0.5 }}>
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
