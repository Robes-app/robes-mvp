'use client';

import { useApiMutation } from '@robes/api-client/react';
import { askRack, type LookAskInput, type LookAskResult } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { ASK_MAX_CHARS, ASK_THREAD_MAX, askDateFrom, type RackState } from '@robes/core/looks';
import { Icon } from '@robes/icons/web';
import { IconButton, Text } from '@robes/ui';
import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useId, useRef, useState } from 'react';
import { localToday } from '@/lib/dates';
import { errorCopy } from '@/lib/error-copy';
import { useLookAsk } from '@/lib/look-states';

type Line = { id: number; who: 'her' | 'robes' | 'filed'; text: string };

function Field({
  label,
  placeholder,
  value,
  drafted,
  busy,
  onChange,
  onSend,
  onFocus,
  trailing,
}: {
  label: string;
  placeholder: string;
  value: string;
  drafted: boolean;
  busy: boolean;
  onChange: (v: string) => void;
  onSend: () => void;
  onFocus?: () => void;
  trailing?: React.ReactNode;
}) {
  const id = useId();
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter is a new line (legacy).
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };
  return (
    <div
      className={`flex items-end gap-2 rounded-soft border px-3 py-2 ${drafted ? 'border-border-control bg-bg' : 'border-hairline bg-surface'}`}
      data-drafted={drafted || undefined}
    >
      <span className="py-2 text-ink-muted" aria-hidden>
        <Icon name="looks" size={18} />
      </span>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        rows={1}
        value={value}
        placeholder={placeholder}
        maxLength={ASK_MAX_CHARS}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        className="max-h-24 min-h-10 flex-1 resize-none bg-transparent py-2 font-display text-lg italic text-ink placeholder:text-ink-muted focus:outline-none"
      />
      {value.trim() ? (
        <IconButton icon="send" label={copy.prompt.send} onClick={onSend} disabled={busy} />
      ) : (
        trailing
      )}
    </div>
  );
}

// The look prompt (legacy _rbLookPrompt, inline): her words change the look behind it; a vague
// ask comes back as Robes' wording in her field; × folds the box and keeps the thread.
export function LookPromptBox({
  lookId,
  name,
  surface,
  rack,
  anchorPieceId,
  changed,
  draft,
  onAnswer,
}: {
  lookId: string;
  name: string;
  surface: LookAskInput['surface'];
  rack: RackState;
  anchorPieceId: string | null;
  changed: boolean;
  draft?: boolean;
  onAnswer: (result: LookAskResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [drafted, setDrafted] = useState(false);
  const [thread, setThread] = useState<Line[]>([]);
  const lineId = useRef(0);
  const line = (who: Line['who'], text: string): Line => {
    lineId.current += 1;
    return { id: lineId.current, who, text };
  };
  const ask = useLookAsk(lookId, (result) => {
    setThread((t) => [
      ...t,
      line('robes', result.reply || copy.prompt.doneNone),
      ...(result.noticed ? [line('filed', copy.prompt.noticed)] : []),
    ]);
    if (result.draft) {
      setText(result.draft);
      setDrafted(true);
    }
    onAnswer(result);
  });
  const placeholder = changed
    ? copy.prompt.doorAfter
    : draft
      ? copy.prompt.doorDraft
      : copy.prompt.doorLook;
  const send = () => {
    const words = text.trim();
    if (!words || ask.reading || rack.rows.length === 0) return;
    const history = thread
      .filter((l): l is Line & { who: 'her' | 'robes' } => l.who !== 'filed')
      .map(({ who, text }) => ({ who, text }))
      .slice(-ASK_THREAD_MAX);
    setThread((t) => [...t, line('her', words)]);
    setText('');
    setDrafted(false);
    setOpen(true);
    ask.send({ surface, text: words, thread: history, rack: askRack(rack, anchorPieceId) });
  };
  return (
    <section
      aria-label={copy.prompt.label(name)}
      className="flex flex-col gap-2"
      data-testid="look-prompt"
    >
      {open && thread.length ? (
        <div className="flex flex-col gap-2 px-1" aria-live="polite">
          {thread.map((entry) =>
            entry.who === 'her' ? (
              <Text
                key={entry.id}
                size="small"
                tone="muted"
                className="self-end border-l border-hairline pl-3"
              >
                {entry.text}
              </Text>
            ) : entry.who === 'filed' ? (
              <Text key={entry.id} size="caption" tone="muted">
                {entry.text}
              </Text>
            ) : (
              <Text key={entry.id} className="font-display text-lg">
                {entry.text}
              </Text>
            ),
          )}
          {ask.reading ? (
            <Text size="small" tone="muted" italic>
              {copy.prompt.busyChange}
            </Text>
          ) : null}
        </div>
      ) : null}
      <Field
        label={placeholder}
        placeholder={placeholder}
        value={text}
        drafted={drafted}
        busy={ask.reading}
        onChange={(v) => {
          setText(v);
          setDrafted(false);
        }}
        onSend={send}
        onFocus={() => setOpen(true)}
        trailing={
          open && thread.length ? (
            <IconButton icon="close" label={copy.prompt.fold} onClick={() => setOpen(false)} />
          ) : null
        }
      />
      {drafted ? (
        <Text size="caption" tone="muted">
          {copy.prompt.drafted}
        </Text>
      ) : null}
    </section>
  );
}

// "A new look for…" (legacy home box, mode new): three suggested looks on the deck, styled for
// the day her words name. Exposed for Home and the empty Suggested tab; `date` pins a dated door.
export function NewLookBox({ date }: { date?: string }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const start = useApiMutation('looks.prompt', {
    onSuccess: ({ jobId }) => router.push(`/looks/style/${jobId}`),
  });
  const send = () => {
    const prompt = text.trim();
    if (prompt.length < 2 || start.isPending) return;
    const day = date ?? askDateFrom(prompt, localToday());
    start.mutate({ input: { prompt, ...(day ? { date: day } : {}) } });
  };
  return (
    <div className="flex flex-col gap-1" data-testid="new-look-box">
      <Field
        label={copy.prompt.doorNew}
        placeholder={copy.prompt.doorNew}
        value={text}
        drafted={false}
        busy={start.isPending}
        onChange={setText}
        onSend={send}
      />
      {start.isError ? (
        <Text size="caption" tone="danger" role="alert">
          {errorCopy(start.error)}
        </Text>
      ) : null}
    </div>
  );
}
