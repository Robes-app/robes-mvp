import { useApiClient } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { Button, Field, IconButton, Text, useToast } from '@robes/ui-native';
import { useState } from 'react';
import { View } from 'react-native';

// "How was this look?" on a suggestion (legacy F8): a verdict lands in her memory; "Not quite"
// asks what would have made it better, then lets the look go (Removed · Undo).
export function LookVerdict({ look, onLetGo }: { look: Look; onLetGo: () => void }) {
  const api = useApiClient();
  const toast = useToast();
  const [asking, setAsking] = useState(false);
  const [liked, setLiked] = useState(false);
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
      {/* Beta's hairline line: the question at left, two thumb circles at right. The web twin
          is app/src/components/looks/look-verdict.tsx. */}
      <View className="flex-row items-center justify-between gap-3 border-hairline border-t pt-4">
        <View className="flex-1">
          <Text className="font-display text-lg">{copy.verdict.title}</Text>
          <Text size="caption" tone="muted">
            {copy.verdict.sub}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <IconButton
            icon="thumbsUp"
            label={copy.verdict.up}
            className={`border ${liked ? 'border-selected-line bg-selected' : 'border-border-control'}`}
            onPress={() => {
              setLiked(true);
              setAsking(false);
              void record(1).then(() => toast.show({ message: copy.verdict.noted }));
            }}
          />
          <IconButton
            icon="thumbsDown"
            label={copy.verdict.down}
            className={`border ${asking ? 'border-selected-line bg-selected' : 'border-border-control'}`}
            onPress={() => {
              setLiked(false);
              setAsking(true);
            }}
          />
        </View>
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
