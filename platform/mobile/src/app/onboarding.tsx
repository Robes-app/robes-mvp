import { onboarding as copy } from '@robes/copy';
import { Button, Eyebrow, Field, Heading, PrimaryScope } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
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
    <PrimaryScope>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center gap-8 bg-bg px-6"
      >
        <View className="gap-2">
          <Eyebrow>{copy.eyebrow}</Eyebrow>
          <Heading>{copy.title}</Heading>
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
        <Button
          onPress={submit}
          disabled={firstName.trim().length === 0}
          loading={busy}
          loadingLabel={copy.saving}
        >
          {copy.continue}
        </Button>
      </KeyboardAvoidingView>
    </PrimaryScope>
  );
}
