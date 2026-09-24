import { queryKeys, useApiClient } from '@robes/api-client/react';
import { onboarding as copy } from '@robes/copy';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Field, PrimaryButton } from '@/components/form';

export default function Onboarding() {
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api.call('me.update', { input: { firstName: firstName.trim() } });
      await api.call('me.onboarding.complete');
      await queryClient.invalidateQueries({ queryKey: queryKeys.route('me.get') });
      router.replace('/');
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center gap-8 bg-bg px-6"
    >
      <View className="gap-2">
        <Text className="text-xs uppercase tracking-widest text-ink-muted">{copy.eyebrow}</Text>
        <Text className="text-4xl text-ink" style={{ fontFamily: 'Cormorant_300Light' }}>
          {copy.title}
        </Text>
      </View>
      <Field
        label={copy.firstNameLabel}
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={60}
        value={firstName}
        onChangeText={setFirstName}
        onSubmitEditing={submit}
        error={error}
      />
      <PrimaryButton onPress={submit} disabled={busy || firstName.trim().length === 0}>
        {busy ? copy.saving : copy.continue}
      </PrimaryButton>
    </KeyboardAvoidingView>
  );
}
