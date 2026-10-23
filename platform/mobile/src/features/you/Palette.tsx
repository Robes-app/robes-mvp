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
import { Button, SegmentedControl, Text, useToast } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { ShadeSwatch } from '@/features/wardrobe/ColourField';
import { errorMessage } from '@/lib/errors';

const copy = you.style.palette;
const STYLE_KEY = queryKeys.call('me.style.get');
type State = '-1' | '0' | '1';
const STATES = [
  { value: '-1', label: copy.states.avoid },
  { value: '0', label: copy.states.none },
  { value: '1', label: copy.states.love },
] as const satisfies ReadonlyArray<{ value: State; label: string }>;

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

function Control({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Preference;
  onChange: (v: Preference) => void;
}) {
  return (
    <SegmentedControl
      size="sm"
      label={label}
      options={STATES}
      value={String(value) as State}
      onChange={(v) => onChange(Number(v) as Preference)}
    />
  );
}

// Your colours (legacy a61f211): families on Avoid · No view · Love, each opening to its shades.
export function ColoursBody() {
  const { palette, set } = usePalette();
  const [open, setOpen] = useState<string | null>(null);
  if (!palette) return null;
  return (
    <View className="gap-2">
      <Text tone="muted">{copy.coloursBody}</Text>
      {COLOUR_FAMILIES.map((f) => {
        const fam = palette.fam[f.id] ?? 0;
        const own = f.shades.some((s) => s.id in palette.shade);
        return (
          <View key={f.id} className="gap-3 border-b border-hairline py-3">
            <View className="flex-row items-center gap-3">
              <View className="flex-row gap-1">
                {f.tile.map((s) => (
                  <ShadeSwatch key={s.id} shade={s} size={18} />
                ))}
              </View>
              <Text>{f.name}</Text>
            </View>
            <Control
              label={f.name}
              value={fam}
              onChange={(v) => set(setPreference(palette, 'fam', f.id, v))}
            />
            <View className="flex-row flex-wrap gap-2">
              <Button variant="quiet" onPress={() => setOpen(open === f.id ? null : f.id)}>
                {open === f.id ? copy.hideShades : copy.showShades}
              </Button>
              {own ? (
                <Button variant="quiet" onPress={() => set(matchFamily(palette, f.id))}>
                  {copy.matchFamily}
                </Button>
              ) : null}
            </View>
            {open === f.id
              ? f.shades.map((s) => (
                  <View key={s.id} className="gap-2 pl-2">
                    <View className="flex-row items-center gap-3">
                      <ShadeSwatch shade={s} size={18} />
                      <Text size="small">{s.name}</Text>
                      <Text size="caption" tone="muted">
                        {s.id in palette.shade ? copy.setHere : copy.fromFamily}
                      </Text>
                    </View>
                    {/* The family's answer is no setting; anything else, No view included, is. */}
                    <Control
                      label={s.name}
                      value={shadePreference(palette, s.id)}
                      onChange={(v) =>
                        set(
                          v === fam
                            ? setPreference(palette, 'shade', s.id, 0)
                            : { ...palette, shade: { ...palette.shade, [s.id]: v } },
                        )
                      }
                    />
                  </View>
                ))
              : null}
          </View>
        );
      })}
    </View>
  );
}

// Your prints: the ten prints Robes can act on.
export function PrintsBody() {
  const { palette, set } = usePalette();
  if (!palette) return null;
  return (
    <View className="gap-2">
      {PATTERNS.filter((p) => p.pref).map((p) => (
        <View key={p.id} className="gap-2 border-b border-hairline py-3">
          <Text>{p.name}</Text>
          <Control
            label={p.name}
            value={palette.print[p.id] ?? 0}
            onChange={(v) => set(setPreference(palette, 'print', p.id, v))}
          />
        </View>
      ))}
    </View>
  );
}
