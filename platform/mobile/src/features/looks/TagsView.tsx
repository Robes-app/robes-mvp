import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { errors, lookbook } from '@robes/copy';
import { Icon } from '@robes/icons/native';
import {
  FINE_EDGE,
  fonts,
  OptionList,
  OptionRow,
  Subview,
  useColor,
  useToast,
} from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

const copy = lookbook.savedLook.tagsView;

// The saved look's details (PR 6): one mutation for its tags, seasons and caption.
export function useLookDetails(look: Look) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const key = queryKeys.call('looks.get', { params: { id: look.id } });
  return useApiMutation('looks.update', {
    onSuccess: (updated) => {
      queryClient.setQueryData(key, updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('looks.list') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.route('wardrobe.summary') });
    },
    onError: () => {
      toast.show({ message: errors.internal });
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

// Felix's TagsView: the tags picker, a subview from Details › Tags. Her tags — the ones her pieces
// and looks wear — as rows with a check once picked; the footer field adds one. Web twin:
// app/src/components/looks/tags-view.tsx.
export function TagsView({
  look,
  open,
  onBack,
}: {
  look: Look;
  open: boolean;
  onBack: () => void;
}) {
  const update = useLookDetails(look);
  const summary = useApi('wardrobe.summary', {}, { enabled: open });
  const [text, setText] = useState('');
  const ink = useColor('ink');
  const muted = useColor('ink-muted');
  const faint = useColor('ink-faint');
  const options = [...new Set([...(summary.data?.wearFor ?? []), ...look.tags])];
  const set = (tags: string[]) => update.mutate({ params: { id: look.id }, input: { tags } });
  const toggle = (tag: string) =>
    set(look.tags.includes(tag) ? look.tags.filter((t) => t !== tag) : [...look.tags, tag]);
  const add = () => {
    const tag = text.trim();
    if (!tag) return;
    setText('');
    if (!look.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) set([...look.tags, tag]);
  };
  return (
    <Subview
      open={open}
      title={copy.title}
      onBack={onBack}
      testID="tags-view"
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
            disabled={!text.trim() || update.isPending}
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
      {options.length ? (
        <OptionList>
          {options.map((tag, i) => (
            <OptionRow
              key={tag}
              first={i === 0}
              label={tag}
              on={look.tags.includes(tag)}
              accessibilityLabel={copy.toggle(tag)}
              onToggle={() => toggle(tag)}
            />
          ))}
        </OptionList>
      ) : null}
    </Subview>
  );
}
