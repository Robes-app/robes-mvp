'use client';

import { marketing, nav, shell } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import { Avatar, type Command, CommandBar, IconButton, Sheet, useCommandHotkey } from '@robes/ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { activeRoot, CREATE_ITEMS, GO_TO_ITEMS, NAV_ITEMS } from '@/lib/nav';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// Signed-in chrome: top nav ≥768, tab bar below, Create sheet and ⌘K everywhere (IA §3.2).
export function AppShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const toggleCommand = useCallback(() => setCommandOpen((o) => !o), []);
  useCommandHotkey(toggleCommand);
  const current = activeRoot(pathname);

  const commands = useMemo<Command[]>(
    () => [
      ...GO_TO_ITEMS.map((i) => ({
        id: `go:${i.href}`,
        label: i.label,
        group: shell.command.groupGo,
        onSelect: () => router.push(i.href),
      })),
      ...CREATE_ITEMS.map((i) => ({
        id: `create:${i.id}`,
        label: i.label,
        group: shell.command.groupCreate,
        ...(i.keywords ? { keywords: i.keywords } : {}),
        onSelect: () => router.push(i.href),
      })),
    ],
    [router],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
          <Link href="/" className={`font-display text-2xl font-light text-ink ${focus}`}>
            {marketing.eyebrow}
          </Link>
          <nav aria-label={shell.primaryNav} className="ml-6 hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current === item.href ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-sm ${
                  current === item.href
                    ? 'text-ink underline underline-offset-8'
                    : 'text-ink-muted hover:text-ink'
                } ${focus}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={toggleCommand}
              aria-keyshortcuts="Meta+K Control+K"
              className={`hidden min-h-11 items-center gap-2 rounded-pill border border-hairline px-4 font-sans text-sm text-ink-muted hover:text-ink md:inline-flex ${focus}`}
            >
              <Icon name="search" size={16} />
              {shell.command.label}
              <kbd className="font-sans text-xs text-ink-faint">{shell.command.hint}</kbd>
            </button>
            <IconButton
              icon="search"
              label={shell.command.label}
              onClick={toggleCommand}
              className="md:hidden"
            />
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={`hidden min-h-11 items-center gap-2 rounded-pill border border-border-control px-5 font-sans text-sm font-medium text-ink hover:border-ink md:inline-flex ${focus}`}
            >
              <Icon name="plus" size={16} />
              {nav.create}
            </button>
            <Link
              href="/you"
              aria-label={shell.openYou}
              aria-current={pathname.startsWith('/you') ? 'page' : undefined}
              className={`ml-1 rounded-pill ${focus}`}
            >
              <Avatar name={name} size="sm" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 md:pb-16">
        {children}
      </main>

      <nav
        aria-label={shell.primaryNav}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <TabLink key={item.href} item={item} active={current === item.href} />
          ))}
          <li className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              aria-label={nav.create}
              className={`flex size-12 items-center justify-center rounded-pill border border-ink text-ink ${focus}`}
            >
              <Icon name="plus" size={22} />
            </button>
          </li>
          {NAV_ITEMS.slice(2).map((item) => (
            <TabLink key={item.href} item={item} active={current === item.href} />
          ))}
        </ul>
      </nav>

      <Sheet title={shell.create.title} open={createOpen} onOpenChange={setCreateOpen}>
        <ul className="flex flex-col">
          {CREATE_ITEMS.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={() => setCreateOpen(false)}
                className={`flex min-h-12 items-center gap-4 rounded-crisp px-2 font-sans text-base text-ink hover:bg-surface-sunk ${focus}`}
              >
                <Icon name={item.icon} size={20} className="text-ink-muted" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>

      <CommandBar
        open={commandOpen}
        onOpenChange={setCommandOpen}
        commands={commands}
        label={shell.command.label}
        placeholder={shell.command.placeholder}
        emptyLabel={shell.command.empty}
      />
    </div>
  );
}

function TabLink({ item, active }: { item: (typeof NAV_ITEMS)[number]; active: boolean }) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-14 flex-col items-center justify-center gap-0.5 font-sans text-xs ${
          active ? 'text-ink' : 'text-ink-muted'
        } ${focus}`}
      >
        <Icon name={item.icon} size={22} />
        {item.label}
      </Link>
    </li>
  );
}
