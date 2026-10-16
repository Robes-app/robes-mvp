'use client';

import { useApiClient } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { Button, Pill, Text, TextArea, useToast } from '@robes/ui';
import { useState } from 'react';

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
    <section
      aria-labelledby="look-verdict"
      className="flex flex-col gap-3"
      data-testid="look-verdict"
    >
      <Text id="look-verdict" size="small" tone="muted">
        {copy.verdict.title}
      </Text>
      <div className="flex gap-2">
        <Pill onClick={() => void record(1).then(() => toast({ message: copy.verdict.noted }))}>
          {copy.verdict.up}
        </Pill>
        <Pill selected={asking} onClick={() => setAsking(true)}>
          {copy.verdict.down}
        </Pill>
      </div>
      {asking ? (
        <div className="flex flex-col gap-2">
          <TextArea
            label={copy.verdict.ask}
            value={body}
            maxLength={240}
            rows={2}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => void record(0, body.trim() || undefined).then(onLetGo)}
          >
            {copy.verdict.send}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
