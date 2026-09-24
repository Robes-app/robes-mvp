import { onboarding as copy } from '@robes/copy';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Field, PrimaryButton } from '@/components/form';
import { api } from '@/lib/api';

export default function Onboarding() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api('/me', { method: 'PATCH', body: JSON.stringify({ firstName: firstName.trim() }) });
      await api('/me/onboarding/complete', { method: 'POST' });
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
