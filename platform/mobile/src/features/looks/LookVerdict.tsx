import { useApiClient } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { Button, Field, Pill, Text, useToast } from '@robes/ui-native';
import { useState } from 'react';
import { View } from 'react-native';

// "How was this look?" on a suggestion (legacy F8): a verdict lands in her memory; "Not quite"
// asks what would have made it better, then lets the look go (Removed · Undo).
export function LookVerdict({ look, onLetGo }: { look: Look; onLetGo: () => void }) {
  const api = useApiClient();
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [body, setBody] = useState('');
  const record = (verdict: 0 | 1, words?: string) =>
    api
      .call('me.memory.record', {
        input: {
          kind: 'verdict',
          verdict,
          ...(words ? { body: words } : {}),
          surface: 'suggested',
          subject: look.name.slice(0, 120),
          lookId: look.id,
        },
      })
      .catch(() => undefined);
  return (
    <View className="gap-3" testID="look-verdict">
      <Text size="small" tone="muted">
        {copy.verdict.title}
      </Text>
      <View className="flex-row gap-2">
        <Pill
          onPress={() => void record(1).then(() => toast.show({ message: copy.verdict.noted }))}
        >
          {copy.verdict.up}
        </Pill>
        <Pill selected={asking} onPress={() => setAsking(true)}>
          {copy.verdict.down}
        </Pill>
      </View>
      {asking ? (
        <View className="gap-2">
          <Field label={copy.verdict.ask} value={body} onChangeText={setBody} maxLength={240} />
          <Button
            variant="secondary"
            onPress={() => void record(0, body.trim() || undefined).then(onLetGo)}
          >
            {copy.verdict.send}
          </Button>
        </View>
      ) : null}
    </View>
  );
}
