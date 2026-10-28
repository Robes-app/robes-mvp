'use client';

import type { Features } from '@robes/contracts';
import { nav, shell } from '@robes/copy';
import { Icon } from '@robes/icons/web';
import {
  Avatar,
  type Command,
  CommandBar,
  Eyebrow,
  Sheet,
  useCommandHotkey,
  Wordmark,
} from '@robes/ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { NewLookBox } from '@/components/home/home-box';
import {
  activeRoot,
  CREATE_GROUPS,
  createItems,
  GO_TO_ITEMS,
  isFlowPath,
  isSettingsPath,
  NAV_ITEMS,
} from '@/lib/nav';
import { FeaturesProvider } from '../features';
import { useDeviceLocation } from './device-location';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// A pushed view (the draft look, legacy 2026-10-06 second pass): below 768 the header and the dock
// stand down while it is open, and its own sticky footer closes the screen.
const PushedContext = createContext<(on: boolean) => void>(() => {});
export function usePushedView(): void {
  const set = useContext(PushedContext);
  useEffect(() => {
    set(true);
    return () => set(false);
  }, [set]);
}

// Signed-in chrome: top nav ≥768; below it beta's dock — a floating bar of the four roots with
// the sparkle beside it for Create (the native twin is mobile/src/components/TabBar.tsx).
// Create sheet and ⌘K everywhere (IA §3.2).
export function AppShell({
  name,
  features,
  children,
}: {
  name: string;
  features: Features;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [pushed, setPushed] = useState(false);
  const toggleCommand = useCallback(() => setCommandOpen((o) => !o), []);
  useCommandHotkey(toggleCommand);
  useDeviceLocation();
  const current = activeRoot(pathname);
  const inFlow = isFlowPath(pathname) || pushed;
  const create = useMemo(() => createItems(features), [features]);
  // The new-look box in the sheet navigates to the deck; the sheet goes with the page it opened on.
  // biome-ignore lint/correctness/useExhaustiveDependencies: closes on every route change
  useEffect(() => setCreateOpen(false), [pathname]);

  const commands = useMemo<Command[]>(
    () => [
      ...GO_TO_ITEMS.map((i) => ({
        id: `go:${i.href}`,
        label: i.label,
        group: shell.command.groupGo,
        onSelect: () => router.push(i.href),
      })),
      ...create.map((i) => ({
        id: `create:${i.id}`,
        label: i.label,
        group: shell.command.groupCreate,
        ...(i.keywords ? { keywords: i.keywords } : {}),
        onSelect: () => router.push(i.href),
      })),
    ],
    [router, create],
  );

  // Settings carries its own header row and no dock (components/settings/settings-chrome.tsx);
  // ⌘K still opens the command bar there.
  if (isSettingsPath(pathname)) {
    return (
      <>
        <main id="main">
          <FeaturesProvider value={features}>{children}</FeaturesProvider>
        </main>
        <CommandBar
          open={commandOpen}
          onOpenChange={setCommandOpen}
          commands={commands}
          label={shell.command.label}
          placeholder={shell.command.placeholder}
          emptyLabel={shell.command.empty}
        />
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className={`sticky top-0 z-40 border-b border-hairline bg-bg/95 backdrop-blur ${pushed ? 'max-md:hidden' : ''}`}
      >
        <div className="mx-auto flex h-11 max-w-5xl items-center gap-2 px-5 md:h-16 md:px-4">
          <Link href="/" aria-label={nav.today} className={`text-ink ${focus}`}>
            <Wordmark />
          </Link>
          <nav aria-label={shell.primaryNav} className="ml-6 hidden items-center gap-1 md:flex">
            {/* Beta's top nav: the wordmark is Home; Lookbook · Diary · Wardrobe sit beside it. */}
            {NAV_ITEMS.filter((item) => item.href !== '/').map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current === item.href ? 'page' : undefined}
                // Sentence-case links, the active one ink on a fine underline.
                className={`inline-flex min-h-11 items-center px-3 font-sans text-sm ${
                  current === item.href
                    ? 'text-ink underline decoration-[1.5px] underline-offset-[7px]'
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
              aria-label={shell.command.label}
              title={`${shell.command.label} ${shell.command.hint}`}
              className={`hidden size-11 items-center justify-center rounded-pill text-ink-muted hover:text-ink md:inline-flex ${focus}`}
            >
              <Icon name="search" size={18} />
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={`hidden min-h-11 items-center gap-2 rounded-pill border border-border-control px-5 font-sans text-sm font-medium text-ink hover:border-ink md:inline-flex ${focus}`}
            >
              <Icon name="looks" size={16} />
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

      <main
        id="main"
        className={`mx-auto w-full max-w-5xl flex-1 px-5 pt-3.5 md:px-4 md:pt-6 md:pb-16 ${inFlow ? 'pb-8' : 'pb-32'}`}
      >
        <PushedContext value={setPushed}>
          <FeaturesProvider value={features}>{children}</FeaturesProvider>
        </PushedContext>
      </main>

      <nav
        aria-label={shell.primaryNav}
        hidden={inFlow}
        className="fixed inset-x-3.5 bottom-0 z-40 flex items-center gap-2.5 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden"
      >
        <ul className="flex h-16 grow items-center justify-between rounded-pill border border-hairline bg-bg/90 px-1.5 shadow-[0_10px_30px_color-mix(in_srgb,var(--color-ink)_10%,transparent)] backdrop-blur-xl">
          {NAV_ITEMS.map((item) => (
            <TabLink key={item.href} item={item} active={current === item.href} />
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label={nav.create}
          className={`flex size-16 shrink-0 items-center justify-center rounded-pill border border-hairline bg-bg/90 text-ink shadow-[0_10px_30px_color-mix(in_srgb,var(--color-ink)_10%,transparent)] backdrop-blur-xl ${focus}`}
        >
          <Icon name="looks" size={22} />
        </button>
      </nav>

      <Sheet title={shell.create.title} open={createOpen} onOpenChange={setCreateOpen}>
        <div className="flex flex-col gap-5">
          {/* Beta's sparkle opens the new-look box (legacy __rbHbOpen({fresh})): here it leads the sheet. */}
          <FeaturesProvider value={features}>
            <NewLookBox autoFocus={createOpen} />
          </FeaturesProvider>
          {CREATE_GROUPS.map((group) => (
            <section
              key={group}
              aria-labelledby={`create-${group}`}
              className="flex flex-col gap-1"
            >
              <Eyebrow id={`create-${group}`}>{shell.create.groups[group]}</Eyebrow>
              <ul className="flex flex-col">
                {create
                  .filter((item) => item.group === group)
                  .map((item) => (
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
            </section>
          ))}
        </div>
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

// Active: ink on a sunk pill; the rest ink-muted (Native parity handoff).
function TabLink({ item, active }: { item: (typeof NAV_ITEMS)[number]; active: boolean }) {
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`flex h-13 flex-col items-center justify-center gap-[3px] rounded-pill font-sans text-[9px] font-medium uppercase tracking-[0.14em] ${
          active ? 'bg-surface-sunk text-ink' : 'text-ink-muted'
        } ${focus}`}
      >
        <Icon name={item.icon} size={20} />
        {item.label}
      </Link>
    </li>
  );
}
