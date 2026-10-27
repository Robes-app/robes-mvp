'use client';

import { useApiClient } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { Button, IconButton, Text, TextArea, useToast } from '@robes/ui';
import { useState } from 'react';

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
    <section
      aria-labelledby="look-verdict"
      className="flex flex-col gap-3"
      data-testid="look-verdict"
    >
      {/* Beta's hairline line (2026-09-17): the question and its sub at left, two thumb circles
          at right; a pick takes the warm fill. */}
      <div className="flex items-center justify-between gap-3 border-hairline border-t pt-4">
        <div className="flex min-w-0 flex-col">
          <Text id="look-verdict" className="font-display text-lg">
            {copy.verdict.title}
          </Text>
          <Text size="caption" tone="muted">
            {copy.verdict.sub}
          </Text>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <IconButton
            icon="thumbsUp"
            label={copy.verdict.up}
            aria-pressed={liked}
            className={`border ${liked ? 'border-selected-line bg-selected' : 'border-border-control'}`}
            onClick={() => {
              setLiked(true);
              setAsking(false);
              void record(1).then(() => toast({ message: copy.verdict.noted }));
            }}
          />
          <IconButton
            icon="thumbsDown"
            label={copy.verdict.down}
            aria-pressed={asking}
            className={`border ${asking ? 'border-selected-line bg-selected' : 'border-border-control'}`}
            onClick={() => {
              setLiked(false);
              setAsking(true);
            }}
          />
        </div>
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
