'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { Icon } from '@robes/icons/web';
import { type KeyboardEvent, useEffect, useId, useMemo, useState } from 'react';
import { cn } from './cn';

export interface Command {
  id: string;
  label: string;
  group: string;
  // Extra words that should match, e.g. "add photo" for "Photograph pieces".
  keywords?: string;
  onSelect: () => void;
}

export interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: readonly Command[];
  label: string;
  placeholder: string;
  emptyLabel: string;
}

export function filterCommands(commands: readonly Command[], query: string): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...commands];
  return commands.filter((c) => `${c.label} ${c.keywords ?? ''}`.toLowerCase().includes(q));
}

// ⌘K / Ctrl+K anywhere toggles the bar.
export function useCommandHotkey(toggle: () => void): void {
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);
}

// WAI-ARIA combobox with a grouped listbox; focus stays in the input (aria-activedescendant).
export function CommandBar({
  open,
  onOpenChange,
  commands,
  label,
  placeholder,
  emptyLabel,
}: CommandBarProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const results = useMemo(() => filterCommands(commands, query), [commands, query]);
  const groups = useMemo(() => {
    const out = new Map<string, Command[]>();
    for (const c of results) out.set(c.group, [...(out.get(c.group) ?? []), c]);
    return [...out.entries()];
  }, [results]);
  const current = results[Math.min(active, results.length - 1)];
  const optionId = (c: Command) => `${listId}-${c.id}`;

  function change(next: boolean) {
    if (!next) {
      setQuery('');
      setActive(0);
    }
    onOpenChange(next);
  }

  function run(command: Command | undefined) {
    if (!command) return;
    change(false);
    command.onSelect();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run(current);
    }
  }

  return (
    <RadixDialog.Root open={open} onOpenChange={change}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-sm" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed top-[12dvh] left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 flex-col overflow-hidden rounded-crisp border border-hairline bg-bg text-ink shadow-xl"
        >
          <RadixDialog.Title className="sr-only">{label}</RadixDialog.Title>
          <div className="flex items-center gap-3 border-b border-hairline px-4 focus-within:border-ink">
            <Icon name="search" size={20} className="text-ink-muted" />
            <input
              role="combobox"
              aria-label={label}
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={current ? optionId(current) : undefined}
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="min-h-14 flex-1 bg-transparent font-sans text-base text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-[50dvh] overflow-y-auto p-2"
          >
            {groups.map(([group, items]) => (
              // biome-ignore lint/a11y/useSemanticElements: a listbox group must be role=group; fieldset isn't allowed inside a listbox.
              <div key={group} role="group" aria-label={group} className="py-1">
                <p aria-hidden className="px-3 py-1 font-sans text-xs font-medium text-ink-muted">
                  {group}
                </p>
                {items.map((c) => (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: keys are handled by the combobox input (aria-activedescendant).
                  <div
                    key={c.id}
                    id={optionId(c)}
                    role="option"
                    aria-selected={c === current}
                    tabIndex={-1}
                    onPointerMove={() => setActive(results.indexOf(c))}
                    onClick={() => run(c)}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center rounded-crisp px-3 font-sans text-sm',
                      c === current ? 'bg-surface-sunk text-ink' : 'text-ink-muted',
                    )}
                  >
                    {c.label}
                  </div>
                ))}
              </div>
            ))}
            {results.length === 0 ? (
              <p className="px-3 py-6 text-center font-sans text-sm text-ink-muted">{emptyLabel}</p>
            ) : null}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
