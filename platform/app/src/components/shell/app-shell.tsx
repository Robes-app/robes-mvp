'use client';

import { useApi } from '@robes/api-client/react';
import type { Features } from '@robes/contracts';
import { lookbook, nav, plan, shell, wardrobe } from '@robes/copy';
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
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BackLink } from '@/components/back-link';
import { NewLookBox } from '@/components/home/home-box';
import { Bell } from '@/components/shell/bell';
import {
  activeRoot,
  backFor,
  CREATE_GROUPS,
  createItems,
  GO_TO_ITEMS,
  isFlowPath,
  isSettingsPath,
  NAV_ITEMS,
  type NavItem,
} from '@/lib/nav';
import { FeaturesProvider } from '../features';
import { useDeviceLocation } from './device-location';

const focus =
  'focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

// The phone bar's serif title on every tab but Home (PRD rev 3 §2.2; the native twin is
// TabScreen's `title`): from 768 the wordmark and the nav stand instead.
const TAB_TITLE: Record<string, string> = {
  '/looks': lookbook.title,
  '/plan': plan.title,
  '/wardrobe': wardrobe.title,
};

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

// A stage of a pushed page that carries its own way out (Add pieces' Review and its ×) takes the
// back pill away (top bar and page head alike) while it shows.
const HideBackContext = createContext<(on: boolean) => void>(() => {});
export function useHideBack(hidden: boolean): void {
  const set = useContext(HideBackContext);
  useEffect(() => {
    set(hidden);
    return () => set(false);
  }, [set, hidden]);
}

// The roots whose grids minimise the dock as she scrolls down (iOS navigation redline).
const MINIMISES = new Set(['/looks', '/wardrobe']);

// Signed-in chrome (iOS navigation redline, 2026-11-04): the top bar on every width, the roots
// beside the wordmark ≥768; below it one full-width capsule of the four roots. No sparkle beside
// it on a phone: dressing starts from home's composer. Native twins: TabScreen (the bar) and
// app/(tabs)/_layout.tsx (the system tab bar). Create sheet from the desktop bar; ⌘K everywhere.
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
  const [backHidden, setBackHidden] = useState(false);
  const search = useSearchParams();
  const back = backHidden ? null : backFor(pathname, search);
  const toggleCommand = useCallback(() => setCommandOpen((o) => !o), []);
  useCommandHotkey(toggleCommand);
  useDeviceLocation();
  const current = activeRoot(pathname);
  // The Wardrobe's badge counts every piece she owns (Front Door PRD rev 3, Q1); none at zero.
  const summary = useApi('wardrobe.summary');
  const owned = summary.data?.total ?? 0;
  const inFlow = isFlowPath(pathname) || pushed;
  const { scrolled, minimised, restore } = useScrollChrome(MINIMISES.has(current), pathname);
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
      {/* Felix's TopNav (D6, 2026-11-06; it replaces the iOS navigation redline's bar): 64 tall at
          every width, 24 in on a phone, nav glass with its blur and a 0.5px hairline beneath,
          always. The native twin is mobile/src/components/TabScreen.tsx. */}
      <header
        data-scrolled={scrolled ? 'true' : undefined}
        className={`sticky top-0 z-40 box-border h-16 border-hairline border-b-[0.5px] bg-nav-glass backdrop-blur-nav ${pushed && !back ? 'max-md:hidden' : ''}`}
      >
        <div className="relative mx-auto flex h-full max-w-5xl items-center gap-2 px-6 md:px-4">
          {/* A pushed page's back pill: below 768 it stands where the wordmark sits, one header row;
              from 768 the bar keeps the wordmark and the pill heads the page (beta's #rb-backpill and
              .rb-ret). Both are drawn and CSS picks one, so the server render is final; the other is
              display:none, out of the accessibility tree. */}
          {back ? (
            <div className="md:hidden">
              <BackLink href={back.href} label={back.label} />
            </div>
          ) : null}
          <Link
            href="/"
            aria-label={nav.today}
            className={`text-ink ${back || TAB_TITLE[current] ? 'max-md:hidden' : ''} ${focus}`}
          >
            <Wordmark />
          </Link>
          {/* The tab's serif title, centred on the phone's bar; the page's own h1 names it for
              assistive tech, so this one is decoration. */}
          {TAB_TITLE[current] && !back ? (
            <span
              aria-hidden
              data-testid="tab-title"
              className="pointer-events-none absolute inset-x-0 text-center font-display font-light text-2xl text-ink md:hidden"
            >
              {TAB_TITLE[current]}
            </span>
          ) : null}
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
          {/* The bell and the avatar disc stand 6 apart; each hit area reaches 44 past its glyph. */}
          <div className="ml-auto flex items-center gap-1.5 md:gap-3">
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
            {/* The bell (design 3k): alerts leave home for here, a dot while anything waits. */}
            <Bell />
            <Link
              href="/you"
              aria-label={shell.openYou}
              aria-current={pathname.startsWith('/you') ? 'page' : undefined}
              className={`relative flex size-[30px] items-center justify-center rounded-pill transition-[opacity,box-shadow] duration-200 hover:shadow-[0_0_0_3px_var(--sage-bg)] active:opacity-60 after:absolute after:-inset-[7px] after:content-[''] ${focus}`}
            >
              <Avatar name={name} tone="nav" />
            </Link>
          </div>
        </div>
      </header>

      <main
        id="main"
        className={`mx-auto w-full max-w-5xl flex-1 px-5 pt-3.5 md:px-4 md:pt-6 md:pb-16 ${inFlow ? 'pb-8' : 'pb-32'}`}
      >
        {back ? (
          <div className="mb-4 max-md:hidden">
            <BackLink href={back.href} label={back.label} />
          </div>
        ) : null}
        <PushedContext value={setPushed}>
          <HideBackContext value={setBackHidden}>
            <FeaturesProvider value={features}>{children}</FeaturesProvider>
          </HideBackContext>
        </PushedContext>
      </main>

      {/* One capsule, 16 from each side and 24 above the screen edge; 4 inset round four tabs. */}
      <nav
        aria-label={shell.primaryNav}
        hidden={inFlow}
        data-minimised={minimised ? 'true' : undefined}
        className="fixed inset-x-4 bottom-6 z-40 md:hidden"
      >
        {minimised ? (
          <MinimisedTab item={NAV_ITEMS.find((i) => i.href === current)} onRestore={restore} />
        ) : (
          <ul className={`flex h-16 items-center rounded-dock border p-1 ${DOCK}`}>
            {NAV_ITEMS.map((item) => (
              <TabLink
                key={item.href}
                item={item}
                active={current === item.href}
                badge={item.href === '/wardrobe' ? owned : 0}
              />
            ))}
          </ul>
        )}
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

// Felix's dock glass: white at 70% with its blur, on the 1px dock line.
const DOCK = 'border-dock-line bg-dock-glass backdrop-blur-dock';

// Felix's dock items: a 20 glyph over the dock-label (9.5/500 at 0.04em), ink-soft; the current one
// ink with a 24×2 ink bar above the glyph. Labels are authored in sentence case and capitalised
// for display only.
function TabLink({
  item,
  active,
  badge = 0,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  // The Wardrobe's count of her pieces (Front Door PRD rev 3, Q1): an 18px ink disc at the
  // glyph's corner, none at zero (plan R11).
  badge?: number;
}) {
  return (
    <li className="flex-1">
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        aria-label={badge > 0 ? `${item.label}, ${badge}` : undefined}
        className={`relative flex h-14 flex-col items-center justify-center gap-1 rounded-pill font-sans font-medium text-[9.5px] uppercase leading-none tracking-[0.04em] whitespace-nowrap ${
          active ? 'text-ink' : 'text-ink-muted'
        } ${focus}`}
      >
        {active ? (
          <span aria-hidden className="absolute top-0.5 h-0.5 w-6 rounded-xs bg-ink" />
        ) : null}
        <span className="relative">
          <Icon name={item.icon} size={20} />
          {badge > 0 ? (
            <span
              aria-hidden
              className="absolute -top-2 -right-3 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-ink px-1 font-sans text-[9.5px] text-bg tracking-normal"
            >
              {badge}
            </span>
          ) : null}
        </span>
        {item.label}
      </Link>
    </li>
  );
}

// Minimised on scroll: the current tab alone, a 56 circle at the leading edge; a tap restores.
function MinimisedTab({ item, onRestore }: { item?: NavItem; onRestore: () => void }) {
  if (!item) return null;
  return (
    <button
      type="button"
      aria-label={item.label}
      aria-expanded={false}
      onClick={onRestore}
      className={`flex size-14 items-center justify-center rounded-pill border text-ink ${DOCK} ${focus}`}
    >
      <Icon name={item.icon} size={24} />
    </button>
  );
}

// The bar's hairline once she leaves the scroll edge; the dock minimises while she scrolls down a
// grid and comes back when she scrolls up.
function useScrollChrome(canMinimise: boolean, pathname: string) {
  const [scrolled, setScrolled] = useState(false);
  const [minimised, setMinimised] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new page starts with the dock whole
  useEffect(() => setMinimised(false), [pathname]);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 0);
      if (canMinimise && Math.abs(y - last) > 8) {
        setMinimised(y > last && y > 64);
        last = y;
      }
      if (!canMinimise) last = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [canMinimise]);
  return { scrolled, minimised, restore: useCallback(() => setMinimised(false), []) };
}
