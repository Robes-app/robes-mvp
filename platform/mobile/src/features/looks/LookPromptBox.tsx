import { askRack, type LookAskInput, type LookAskResult } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { ASK_MAX_CHARS, ASK_THREAD_MAX, type RackState } from '@robes/core/looks';
import { Icon } from '@robes/icons/native';
import { IconButton, Text, useColor } from '@robes/ui-native';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useLookAsk } from './look-states';

type Line = { id: number; who: 'her' | 'robes' | 'filed'; text: string };

// The look prompt (legacy _rbLookPrompt, inline design 4b/4d): one field on every look. Her
// words change the look behind it; a vague ask comes back as Robes' wording written into her
// field; × folds the box and keeps the thread; nothing here is ever stored.
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
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
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
    <View accessibilityLabel={copy.prompt.label(name)} className="gap-2" testID="look-prompt">
      {open && thread.length ? (
        <View className="gap-2 px-1">
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
            ) : (
              <Text
                key={entry.id}
                size={entry.who === 'filed' ? 'caption' : 'body'}
                tone={entry.who === 'filed' ? 'muted' : 'ink'}
              >
                {entry.text}
              </Text>
            ),
          )}
          {ask.reading ? (
            <Text size="small" tone="muted" style={{ fontStyle: 'italic' }}>
              {copy.prompt.busyChange}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View
        className={`flex-row items-end gap-2 rounded-soft border px-3 py-2 ${drafted ? 'border-border-control bg-surface-sunk' : 'border-hairline bg-surface'}`}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.prompt.label(name)}
          onPress={() => setOpen((o) => !o)}
          className="py-2"
        >
          <Icon name="looks" size={18} color={muted} />
        </Pressable>
        <TextInput
          accessibilityLabel={placeholder}
          placeholder={placeholder}
          placeholderTextColor={muted}
          value={text}
          onChangeText={(v) => {
            setText(v);
            setDrafted(false);
          }}
          onFocus={() => setOpen(true)}
          maxLength={ASK_MAX_CHARS}
          multiline
          submitBehavior="submit"
          returnKeyType="send"
          onSubmitEditing={send}
          className="flex-1 py-2 text-base"
          style={{ color: ink, maxHeight: 96 }}
          testID="look-prompt-input"
        />
        {text.trim() ? (
          <IconButton icon="send" label={copy.prompt.send} onPress={send} disabled={ask.reading} />
        ) : open && thread.length ? (
          <IconButton icon="close" label={copy.prompt.fold} onPress={() => setOpen(false)} />
        ) : null}
      </View>
      {drafted ? (
        <Text size="caption" tone="muted">
          {copy.prompt.drafted}
        </Text>
      ) : null}
    </View>
  );
}
