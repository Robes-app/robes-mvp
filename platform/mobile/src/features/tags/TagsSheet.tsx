import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { HerTag } from '@robes/contracts';
import { tags as copy, errors } from '@robes/copy';
import { drawerOrder, matchesWearFor, toggleValue } from '@robes/core/filters';
import { Icon } from '@robes/icons/native';
import {
  AlertDialog,
  FINE_EDGE,
  fonts,
  OptionList,
  OptionRow,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { DetentSheet } from '@/components/DetentSheet';
import { SwipeRow } from '@/components/SwipeRow';

// What a deleted tag was on: every list and page that shows a look's or a piece's tags.
const TAGGED_ROUTES = [
  'tags.list',
  'looks.list',
  'looks.get',
  'wardrobe.list',
  'wardrobe.get',
  'wardrobe.summary',
] as const;

// Her tags (tags cleanup, 26 Nov): one drawer for a look's tags and a piece's alike, on iOS's own
// sheet as Seasons is. Her own tags lead, newest first, then the defaults (`drawerOrder`); a tap
// ticks one and is the answer, so Done is the one way out. "Add a tag" makes one and ticks it
// ("work" typed is her Work). A swipe deletes a tag from her list and from everything carrying
// it, asking first when anything does; iOS shows one modal at a time, so the sheet steps aside
// for the question and comes back after. Web twin: app/src/components/tags/tags-sheet.tsx.
export function TagsSheet({
  open,
  selected,
  onChange,
  onClose,
  testID = 'tags-sheet',
}: {
  open: boolean;
  selected: readonly string[];
  onChange: (tags: string[]) => void;
  onClose: () => void;
  testID?: string;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const list = useApi('tags.list', undefined, { enabled: open });
  const [text, setText] = useState('');
  const [asking, setAsking] = useState<HerTag | null>(null);
  // The sheet has gone for the question: the dialog can stand.
  const [aside, setAside] = useState(false);
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');

  const refresh = () =>
    Promise.all(
      TAGGED_ROUTES.map((r) => queryClient.invalidateQueries({ queryKey: queryKeys.route(r) })),
    );
  const remove = useApiMutation('tags.delete', {
    onSuccess: refresh,
    onError: () => {
      toast.show({ message: errors.internal });
      void refresh();
    },
  });

  const mine = drawerOrder(list.data?.items ?? []);
  // A tag just ticked or typed that the list has not caught up with yet still shows, on top.
  const pending = selected.filter((s) => !mine.some((t) => matchesWearFor([t.label], [s])));
  const rows = [
    ...pending.map((label) => ({ label, tag: null })),
    ...mine.map((t) => ({ label: t.label, tag: t })),
  ];
  const on = (label: string) => matchesWearFor(selected, [label]);

  const add = () => {
    const typed = text.trim();
    if (!typed) return;
    setText('');
    const known = rows.find((r) => matchesWearFor([r.label], [typed]))?.label ?? typed;
    if (!on(known)) onChange([...selected, known]);
  };
  const drop = (tag: HerTag) => {
    if (tag.looks + tag.pieces === 0) remove.mutate({ params: { id: tag.id } });
    else setAsking(tag);
  };
  const answer = (yes: boolean) => {
    if (yes && asking) remove.mutate({ params: { id: asking.id } });
    setAside(false);
  };

  return (
    <>
      <DetentSheet
        open={open && !asking}
        // Stepping aside for the question is not her closing the drawer.
        onClose={() => {
          if (!asking) onClose();
        }}
        onClosed={() => {
          if (asking) setAside(true);
        }}
        title={copy.title}
        done={{ label: copy.done, onPress: onClose }}
        leading={<View style={{ width: 36 }} />}
        scroll
        testID={testID}
        footer={
          <View
            className="flex-row items-center gap-2.5 rounded-pill border-rule-mid bg-surface-raised pl-4"
            style={{ height: 44, paddingRight: 6, borderWidth: FINE_EDGE }}
          >
            <Icon name="tag" size={15} color={muted} />
            <TextInput
              accessibilityLabel={copy.add}
              value={text}
              onChangeText={setText}
              onSubmitEditing={add}
              returnKeyType="done"
              maxLength={40}
              placeholder={copy.add}
              placeholderTextColor={faint}
              className="flex-1"
              style={{ fontFamily: fonts.sans, fontSize: 14, color: ink, paddingVertical: 0 }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.keep}
              disabled={!text.trim()}
              onPress={add}
              hitSlop={6}
              className="items-center justify-center rounded-pill bg-surface-sunk"
              style={{ width: 32, height: 32, opacity: text.trim() ? 1 : 0.4 }}
            >
              <Icon name="check" size={14} color={ink} />
            </Pressable>
          </View>
        }
      >
        <OptionList>
          {rows.map(({ label, tag }, i) => {
            const row = (
              <OptionRow
                key={label}
                first={i === 0}
                label={label}
                on={on(label)}
                accessibilityLabel={copy.toggle(label)}
                onToggle={() => onChange(toggleValue(selected, label))}
              />
            );
            return tag ? (
              <SwipeRow
                key={tag.id}
                className=""
                text={copy.delete}
                label={copy.deleteLabel(label)}
                onAct={() => drop(tag)}
              >
                {row}
              </SwipeRow>
            ) : (
              <View key={`new-${label}`}>{row}</View>
            );
          })}
        </OptionList>
      </DetentSheet>
      <AlertDialog
        open={aside && asking !== null}
        title={asking ? copy.confirmTitle(asking.label) : ''}
        message={asking ? copy.confirmBody(asking.looks, asking.pieces) : ''}
        actions={[
          { label: copy.delete, variant: 'danger', onPress: () => answer(true) },
          { label: copy.cancel, variant: 'quiet', onPress: () => answer(false) },
        ]}
        onDismiss={() => answer(false)}
        // Gone: the drawer comes back.
        onClosed={() => setAsking(null)}
        testID="delete-tag-confirm"
      />
    </>
  );
}
