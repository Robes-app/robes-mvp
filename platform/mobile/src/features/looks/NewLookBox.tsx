import { useApiMutation } from '@robes/api-client/react';
import { lookbook as copy } from '@robes/copy';
import { ASK_MAX_CHARS, askDateFrom } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { ErrorText, IconButton, Text, useColor } from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { localDate } from './saved-looks';

// "Where to, and how should it feel?" (legacy home box, mode new): her words become three suggested looks on the
// keep-or-pass deck, styled for the day they name (read deterministically, never guessed).
// Exposed for Home and the empty Suggested tab; `date` pins a dated door (a day page).
export function NewLookBox({ date, autoFocus = false }: { date?: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const start = useApiMutation('looks.prompt', {
    onSuccess: ({ jobId }) => {
      setText('');
      router.push(`/looks/job/${jobId}`);
    },
  });
  const send = () => {
    const prompt = text.trim();
    if (prompt.length < 2 || start.isPending) return;
    const day = date ?? askDateFrom(prompt, localDate());
    start.mutate({ input: { prompt, ...(day ? { date: day } : {}) } });
  };
  return (
    <View className="gap-1" testID="new-look-box">
      <View className="flex-row items-end gap-2 rounded-soft border border-hairline bg-surface px-3 py-2">
        <View className="py-2">
          <Icon name="looks" size={18} color={muted} />
        </View>
        <TextInput
          accessibilityLabel={copy.prompt.doorNew}
          placeholder={copy.prompt.doorNew}
          placeholderTextColor={muted}
          value={text}
          onChangeText={setText}
          autoFocus={autoFocus}
          maxLength={ASK_MAX_CHARS}
          multiline
          submitBehavior="submit"
          returnKeyType="send"
          onSubmitEditing={send}
          className="flex-1 py-2 text-base"
          style={{ color: ink, maxHeight: 96 }}
        />
        {text.trim() ? (
          <IconButton
            icon="send"
            label={copy.prompt.send}
            onPress={send}
            disabled={start.isPending}
          />
        ) : null}
      </View>
      {start.isError ? <ErrorText size="caption">{errorMessage(start.error)}</ErrorText> : null}
    </View>
  );
}
