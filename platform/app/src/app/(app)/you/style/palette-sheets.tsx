'use client';

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
import { Button, SegmentedControl, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ShadeSwatch } from '@/components/wardrobe/colour-field';
import { errorCopy } from '@/lib/error-copy';

const copy = you.style.palette;
const STYLE_KEY = queryKeys.call('me.style.get');
type State = '-1' | '0' | '1';
const STATES = [
  { value: '-1', label: copy.states.avoid },
  { value: '0', label: copy.states.none },
  { value: '1', label: copy.states.love },
] as const satisfies ReadonlyArray<{ value: State; label: string }>;

// The Style DNA rows' values: "2 loved · 1 avoided".
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
      toast({ message: errorCopy(err) });
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

// Your colours: the 13 families on Avoid · No view · Love; a family opens to its shades, which
// follow it until she sets one (legacy a61f211).
export function ColoursBody() {
  const { palette, set } = usePalette();
  const [open, setOpen] = useState<string | null>(null);
  if (!palette) return null;
  return (
    <div className="flex flex-col gap-2">
      <Text tone="muted">{copy.coloursBody}</Text>
      <ul className="flex flex-col divide-y divide-hairline">
        {COLOUR_FAMILIES.map((f) => {
          const fam = palette.fam[f.id] ?? 0;
          const own = f.shades.filter((s) => s.id in palette.shade);
          return (
            <li key={f.id} className="flex flex-col gap-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className="flex -space-x-1.5">
                    {f.tile.map((s) => (
                      <ShadeSwatch key={s.id} shade={s} size={20} />
                    ))}
                  </span>
                  <span className="font-sans text-base text-ink">{f.name}</span>
                </span>
                <Control
                  label={f.name}
                  value={fam}
                  onChange={(v) => set(setPreference(palette, 'fam', f.id, v))}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="quiet"
                  aria-expanded={open === f.id}
                  onClick={() => setOpen(open === f.id ? null : f.id)}
                >
                  {open === f.id ? copy.hideShades : copy.showShades}
                </Button>
                {own.length ? (
                  <Button variant="quiet" onClick={() => set(matchFamily(palette, f.id))}>
                    {copy.matchFamily}
                  </Button>
                ) : null}
              </div>
              {open === f.id ? (
                <ul aria-label={copy.shades(f.name)} className="flex flex-col gap-3 pl-2">
                  {f.shades.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-3">
                        <ShadeSwatch shade={s} size={20} />
                        <span className="flex flex-col">
                          <span className="font-sans text-sm text-ink">{s.name}</span>
                          <span className="font-sans text-xs text-ink-muted">
                            {s.id in palette.shade ? copy.setHere : copy.fromFamily}
                          </span>
                        </span>
                      </span>
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
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Your prints: the ten prints Robes can act on.
export function PrintsBody() {
  const { palette, set } = usePalette();
  if (!palette) return null;
  return (
    <ul className="flex flex-col divide-y divide-hairline">
      {PATTERNS.filter((p) => p.pref).map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <span className="flex items-center gap-3">
            {/* The print's swatch is the colour model's data, as the shade swatches. */}
            <span
              aria-hidden
              className="inline-block size-8 shrink-0 rounded-full border border-hairline"
              style={{ background: p.css }}
            />
            <span className="font-sans text-base text-ink">{p.name}</span>
          </span>
          <Control
            label={p.name}
            value={palette.print[p.id] ?? 0}
            onChange={(v) => set(setPreference(palette, 'print', p.id, v))}
          />
        </li>
      ))}
    </ul>
  );
}
