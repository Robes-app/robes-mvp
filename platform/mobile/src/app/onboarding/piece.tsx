import { queryKeys, useApiClient } from '@robes/api-client/react';
import { onboarding as copy, errors, looks } from '@robes/copy';
import { Button, Eyebrow, Field, Heading, PrimaryScope, Text } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { errorMessage } from '@/lib/errors';

// Onboarding screen 2: the first piece, described in words, straight into its first styling.
export default function FirstPiece() {
  const router = useRouter();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'style' | 'skip' | null>(null);

  async function finish(): Promise<void> {
    await api.call('me.onboarding.complete');
    await queryClient.invalidateQueries({ queryKey: queryKeys.route('me.get') });
  }

  async function style() {
    setBusy('style');
    setError(null);
    try {
      const { jobId } = await api.call('looks.generate', {
        input: { anchor: { type: 'text', text: text.trim() } },
      });
      await finish();
      router.replace(`/looks/job/${jobId}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  async function skip() {
    setBusy('skip');
    try {
      await finish();
      router.replace('/');
    } catch {
      setError(errors.internal);
      setBusy(null);
    }
  }

  return (
    <PrimaryScope>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center gap-8 bg-bg px-6"
      >
        <View className="gap-2">
          <Eyebrow>{copy.pieceEyebrow}</Eyebrow>
          <Heading>{copy.pieceTitle}</Heading>
          <Text tone="muted">{copy.pieceBody}</Text>
        </View>
        <Field
          label={looks.stylePiece.describe}
          placeholder={looks.stylePiece.describePlaceholder}
          maxLength={300}
          value={text}
          onChangeText={setText}
          error={error}
        />
        <View className="gap-4">
          <Button
            onPress={style}
            disabled={text.trim().length < 2 || busy !== null}
            loading={busy === 'style'}
            loadingLabel={looks.stylePiece.starting}
          >
            {looks.stylePiece.start}
          </Button>
          <Button variant="quiet" onPress={skip} disabled={busy !== null} className="self-center">
            {copy.skip}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </PrimaryScope>
  );
}
