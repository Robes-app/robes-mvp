import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Palette, StyleProfile } from '@robes/contracts';
import { you } from '@robes/copy';
import {
  COLOUR_FAMILIES,
  matchFamily,
  PATTERNS,
  type Preference,
  paletteTally,
  setPreference,
  shadePreference,
} from '@robes/core/colour';
import { Button, PreferenceControl, Text, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { FamilyTile, ShadeSwatch } from '@/features/wardrobe/ColourField';
import { errorMessage } from '@/lib/errors';

const copy = you.style.palette;
const STYLE_KEY = queryKeys.call('me.style.get');

export function paletteSummary(p: Palette | undefined, kind: 'colours' | 'prints'): string {
  if (!p) return '';
  const { love, avoid } = paletteTally(p, kind);
  return copy.summary(love, avoid);
}

// Her palette, saved whole on each change; the cache moves first so the control never lags.
export function usePalette() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const query = useApi('me.style.get');
  const save = useApiMutation('me.style.palette', {
    onSuccess: (data) => queryClient.setQueryData(STYLE_KEY, data),
    onError: (err) => {
      toast.show({ message: errorMessage(err) });
      void queryClient.invalidateQueries({ queryKey: STYLE_KEY });
    },
  });
  const set = (next: Palette) => {
    queryClient.setQueryData(STYLE_KEY, (old: StyleProfile | undefined) =>
      old ? { ...old, palette: next } : old,
    );
    save.mutate({ input: next });
  };
  return { palette: query.data?.palette, set };
}

// A row carries her answer: love is the warm fill across the row, avoid fades the tile and name.
const rowClass = (v: Preference): string =>
  `border-b border-hairline px-3 ${v === 1 ? 'bg-selected' : ''}`;
const nameTone = (v: Preference): 'ink' | 'faint' => (v === -1 ? 'faint' : 'ink');

// Your colours (legacy a61f211): the 13 families on Avoid · No view · Love; a family's tile and
// name open its shades, which follow it until she sets one.
export function ColoursBody() {
  const { palette, set } = usePalette();
  const [open, setOpen] = useState<string | null>(null);
  if (!palette) return null;
  return (
    <View className="gap-2">
      <Text tone="muted">{copy.coloursSub}</Text>
      <View className="mt-1.5">
        {COLOUR_FAMILIES.map((f) => {
          const fam = palette.fam[f.id] ?? 0;
          const own = f.shades.filter((s) => s.id in palette.shade);
          const shown = open === f.id;
          return (
            <View key={f.id} className={rowClass(fam)}>
              <View className="flex-row items-center gap-3 py-3">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.shades(f.name)}
                  accessibilityState={{ expanded: shown }}
                  onPress={() => setOpen(shown ? null : f.id)}
                  className="flex-1 flex-row items-center gap-4"
                >
                  <View className={fam === -1 ? 'opacity-40' : undefined}>
                    <FamilyTile family={f} />
                  </View>
                  <View className="flex-1 gap-[3px]">
                    <Text tone={nameTone(fam)}>{f.name}</Text>
                    <Text size="caption" tone="muted">
                      {own.length ? copy.shadesSet(own.length) : ''}
                    </Text>
                  </View>
                </Pressable>
                <PreferenceControl
                  label={f.name}
                  value={fam}
                  labels={copy.states}
                  onChange={(v) => set(setPreference(palette, 'fam', f.id, v))}
                />
              </View>
              {shown ? (
                <View className="gap-1 pb-3.5 pl-16">
                  {f.shades.map((s) => (
                    <View key={s.id} className="min-h-11 flex-row items-center gap-3">
                      <ShadeSwatch shade={s} size={26} />
                      <Text size="small" className="flex-1">
                        {s.name}
                      </Text>
                      {/* The family's answer is no setting of its own; anything else is. */}
                      <PreferenceControl
                        size="sm"
                        label={s.name}
                        follows={f.name}
                        inherited={fam}
                        value={s.id in palette.shade ? shadePreference(palette, s.id) : null}
                        labels={copy.states}
                        onChange={(v) =>
                          set(
                            v === fam
                              ? setPreference(palette, 'shade', s.id, 0)
                              : { ...palette, shade: { ...palette.shade, [s.id]: v } },
                          )
                        }
                      />
                    </View>
                  ))}
                  {own.length ? (
                    <Button
                      variant="quiet"
                      className="self-start"
                      onPress={() => set(matchFamily(palette, f.id))}
                    >
                      {copy.matchFamily}
                    </Button>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      <Text size="small" tone="muted" className="mt-4">
        {copy.coloursNote}
      </Text>
    </View>
  );
}

// Your prints: the ten prints Robes can act on. A pattern is a CSS gradient on the web, which
// React Native cannot paint, so a print row here is its name and her answer.
export function PrintsBody() {
  const { palette, set } = usePalette();
  if (!palette) return null;
  return (
    <View className="gap-2">
      <Text tone="muted">{copy.printsSub}</Text>
      <View className="mt-1.5">
        {PATTERNS.filter((p) => p.pref).map((p) => {
          const v = palette.print[p.id] ?? 0;
          return (
            <View key={p.id} className={rowClass(v)}>
              <View className="flex-row items-center gap-3 py-3">
                <Text tone={nameTone(v)} className="flex-1">
                  {p.name}
                </Text>
                <PreferenceControl
                  label={p.name}
                  value={v}
                  labels={copy.states}
                  onChange={(next) => set(setPreference(palette, 'print', p.id, next))}
                />
              </View>
            </View>
          );
        })}
      </View>
      <Text size="small" tone="muted" className="mt-4">
        {copy.printsNote}
      </Text>
    </View>
  );
}
