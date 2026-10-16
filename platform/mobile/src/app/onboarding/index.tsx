import { queryKeys, useApi, useApiClient } from '@robes/api-client/react';
import { firstRun as copy, onboarding } from '@robes/copy';
import { Button, Eyebrow, Field, Heading, PrimaryScope, Text } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { FirstRunFrame } from '@/features/home/FirstRunFrame';

const SPLASH_MS = 2_000;

// Splash → name (legacy 0478e63): the dark wordmark hands to her name, which leads to the piece.
export default function Onboarding() {
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const me = useApi('me.get');
  const [splash, setSplash] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = touched ? firstName : firstName || me.data?.firstName || '';

  useEffect(() => {
    if (!splash) return;
    const t = setTimeout(() => setSplash(false), SPLASH_MS);
    return () => clearTimeout(t);
  }, [splash]);

  async function submit() {
    const first = name.trim().split(/\s+/)[0];
    if (!first) return;
    setBusy(true);
    setError(null);
    try {
      await api.call('me.update', { input: { firstName: first } });
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('me.get') });
      router.push('/onboarding/piece');
    } catch {
      setError(onboarding.failed);
    } finally {
      setBusy(false);
    }
  }

  if (splash) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.wordmark}
        onPress={() => setSplash(false)}
        className="flex-1 items-center justify-center bg-ink"
        testID="splash"
      >
        <Text className="text-5xl text-bg">{copy.wordmark}</Text>
      </Pressable>
    );
  }

  return (
    <PrimaryScope>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-bg"
      >
        <FirstRunFrame
          segs={1}
          footer={
            <Button
              onPress={submit}
              disabled={name.trim().length === 0}
              loading={busy}
              loadingLabel={onboarding.saving}
            >
              {copy.name.continue}
            </Button>
          }
        >
          <View className="gap-2 pt-6">
            <Eyebrow>{copy.name.eyebrow}</Eyebrow>
            <Heading>
              {copy.name.title} <Text className="italic">{copy.name.titleEm}</Text>
            </Heading>
          </View>
          <Field
            label={copy.name.label}
            placeholder={copy.name.placeholder}
            autoComplete="given-name"
            textContentType="givenName"
            maxLength={60}
            value={name}
            onChangeText={(v) => {
              setTouched(true);
              setFirstName(v);
            }}
            onSubmitEditing={submit}
            error={error}
          />
          <Text size="small" tone="muted">
            {copy.name.notes}
          </Text>
        </FirstRunFrame>
      </KeyboardAvoidingView>
    </PrimaryScope>
  );
}
