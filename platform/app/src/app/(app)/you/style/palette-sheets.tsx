'use client';

import { queryKeys, useApi, useApiMutation } from '@robes/api-client/react';
import type { Palette, StyleProfile } from '@robes/contracts';
import { you } from '@robes/copy';
import {
  COLOUR_FAMILIES,
  matchFamily,
  PATTERNS,
  type Preference,
  paletteWords,
  setPreference,
  shadePreference,
} from '@robes/core/colour';
import { Icon } from '@robes/icons/web';
import { Button, PreferenceControl, Text, useToast } from '@robes/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FamilyTile, PatternSwatch, ShadeSwatch } from '@/components/wardrobe/colour-field';
import { errorCopy } from '@/lib/error-copy';

const copy = you.style.palette;
const STYLE_KEY = queryKeys.call('me.style.get');

// The Style DNA rows' values: what she loves, first and a count ("Blacks +2"). Native twin:
// mobile/src/features/you/Palette.tsx.
export function paletteSummary(p: Palette | undefined, kind: 'colours' | 'prints'): string {
  if (!p) return '';
  return copy.summary(paletteWords(p, kind, 1));
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

// A row carries her answer: love is the warm fill across the whole row; avoid fades the tile only —
// the name stays ink, for contrast. An open family sits on cream so its shades read as one group.
// Never black — selected is warm here as everywhere (brand-and-design §1).
const rowClass = (v: Preference, open = false): string =>
  `-mx-3 border-hairline border-b px-3 motion-safe:transition-colors ${v === 1 ? 'bg-selected' : open ? 'bg-surface' : ''}`;
const nameClass = (v: Preference): string =>
  `font-sans text-base text-ink ${v === 1 ? 'font-medium' : ''}`;

// Your colours: the 13 families on Avoid · No view · Love; the tile and the name are one
// disclosure that opens the family's shades, which follow it until she sets one (legacy a61f211).
export function ColoursBody() {
  const { palette, set } = usePalette();
  const [open, setOpen] = useState<string | null>(null);
  if (!palette) return null;
  return (
    <div className="flex flex-col gap-2">
      <Text tone="muted">{copy.coloursSub}</Text>
      <ul className="mt-1.5 flex flex-col">
        {COLOUR_FAMILIES.map((f) => {
          const fam = palette.fam[f.id] ?? 0;
          const own = f.shades.filter((s) => s.id in palette.shade);
          const shown = open === f.id;
          return (
            <li key={f.id} className={rowClass(fam, shown)}>
              <div className="flex flex-wrap items-center gap-3 py-3">
                <button
                  type="button"
                  aria-expanded={shown}
                  aria-label={copy.shades(f.name)}
                  onClick={() => setOpen(shown ? null : f.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 text-left"
                >
                  <span className={fam === -1 ? 'opacity-40' : undefined}>
                    <FamilyTile family={f} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className={`flex items-center gap-1.5 ${nameClass(fam)}`}>
                      {f.name}
                      <Icon
                        name="down"
                        size={12}
                        className={`text-ink-faint motion-safe:transition-transform ${shown ? 'rotate-180' : ''}`}
                      />
                    </span>
                    <span className="min-h-3 font-sans text-ink-muted text-xs">
                      {own.length ? copy.shadesSet(own.length) : ''}
                    </span>
                  </span>
                </button>
                <PreferenceControl
                  label={f.name}
                  value={fam}
                  labels={copy.states}
                  onChange={(v) => set(setPreference(palette, 'fam', f.id, v))}
                />
              </div>
              {shown ? (
                <ul aria-label={copy.shades(f.name)} className="flex flex-col pb-3.5 pl-16">
                  {f.shades.map((s) => (
                    <li key={s.id} className="flex min-h-11 flex-wrap items-center gap-3">
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <ShadeSwatch shade={s} size={26} />
                        <span className="font-sans text-ink text-sm">{s.name}</span>
                      </span>
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
                    </li>
                  ))}
                  {/* The foot of an open family: hand every shade back to the family's answer. */}
                  <Button
                    variant="quiet"
                    className="min-h-11 self-start px-0"
                    disabled={!own.length}
                    onClick={() => set(matchFamily(palette, f.id))}
                  >
                    {copy.matchFamily}
                  </Button>
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Text size="small" tone="muted" className="mt-4">
        {copy.coloursNote}
      </Text>
    </div>
  );
}

// Your prints: the ten prints Robes can act on.
export function PrintsBody() {
  const { palette, set } = usePalette();
  if (!palette) return null;
  return (
    <div className="flex flex-col gap-2">
      <Text tone="muted">{copy.printsSub}</Text>
      <ul className="mt-1.5 flex flex-col">
        {PATTERNS.filter((p) => p.pref).map((p) => {
          const v = palette.print[p.id] ?? 0;
          return (
            <li key={p.id} className={rowClass(v)}>
              <div className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex min-w-0 flex-1 items-center gap-4">
                  <span className={v === -1 ? 'opacity-40' : undefined}>
                    <PatternSwatch pattern={p} />
                  </span>
                  <span className={nameClass(v)}>{p.name}</span>
                </span>
                <PreferenceControl
                  label={p.name}
                  value={v}
                  labels={copy.states}
                  onChange={(next) => set(setPreference(palette, 'print', p.id, next))}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <Text size="small" tone="muted" className="mt-4">
        {copy.printsNote}
      </Text>
    </div>
  );
}
