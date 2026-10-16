import { today } from '@robes/copy';
import { Button, Eyebrow, Field, Heading, PrimaryScope, Text } from '@robes/ui-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { useStartDaily } from './daily';

const copy = today.daily;

// Style it for today: an optional brief; an empty one styles a regular day.
export function DailyStart() {
  const [prompt, setPrompt] = useState('');
  const start = useStartDaily();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView contentContainerClassName="gap-5 px-6 py-6" keyboardShouldPersistTaps="handled">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Heading size="xl">{copy.title}</Heading>
        <Field
          label={copy.promptLabel}
          placeholder={copy.promptPlaceholder}
          value={prompt}
          onChangeText={setPrompt}
          maxLength={500}
          multiline
        />
        {start.isError ? <Text tone="danger">{errorMessage(start.error)}</Text> : null}
        <PrimaryScope>
          <Button
            onPress={() => start.mutate({ input: prompt.trim() ? { prompt: prompt.trim() } : {} })}
            loading={start.isPending || start.isSuccess}
            loadingLabel={copy.starting}
          >
            {copy.start}
          </Button>
        </PrimaryScope>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
