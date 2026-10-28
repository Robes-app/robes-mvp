import type { Features } from '@robes/contracts';
import { lookbook, looks, nav, plan, shell, wardrobe, you } from '@robes/copy';
import { isDestination } from '@robes/core/add-flow';
import { monthLabel } from '@robes/core/calendar';
import type { IconName } from '@robes/icons/web';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

// The four roots, in beta's dock order on every surface (Native parity handoff 2026-10-25; the
// native twin is mobile/src/app/(tabs)/_layout.tsx). Create is the sparkle beside them.
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: nav.today, icon: 'today' },
  { href: '/looks', label: nav.looks, icon: 'book' },
  { href: '/plan', label: nav.plan, icon: 'plan' },
  { href: '/wardrobe', label: nav.wardrobe, icon: 'wardrobe' },
];

// No Create option waits on a placeholder today; the new-look box answers Ask Robes in the sheet.
export const SOON_SLUGS: readonly string[] = [];
export type SoonSlug = string;

export type CreateGroup = 'add' | 'dress';

export interface CreateItem extends NavItem {
  id: string;
  group: CreateGroup;
  keywords?: string;
}

// The Create sheet (IA §3.2), grouped: pieces in — the Add pieces sheet's own doors (design "Add
// Piece — Handoff"; native draws AddPiecesPanel itself) — then the stylist (the sparkle, never a
// chat bubble). Unbuilt options go to one shared "On its way" page.
export const CREATE_ITEMS: readonly CreateItem[] = [
  {
    id: 'photograph',
    group: 'add',
    href: '/wardrobe/add?start=camera',
    label: wardrobe.add.doors.photograph,
    icon: 'camera',
    keywords: 'add photo camera',
  },
  {
    id: 'camera-roll',
    group: 'add',
    href: '/wardrobe/add',
    label: wardrobe.add.doors.cameraRoll,
    icon: 'image',
    keywords: 'add photo upload',
  },
  {
    id: 'link',
    group: 'add',
    href: '/wardrobe/link',
    label: wardrobe.add.doors.link,
    icon: 'link',
  },
  {
    id: 'receipt',
    group: 'add',
    href: '/wardrobe/receipt',
    label: wardrobe.add.doors.receipt,
    icon: 'mail',
  },
  {
    id: 'manual',
    group: 'add',
    href: '/wardrobe/manual',
    label: wardrobe.add.doors.manual,
    icon: 'pencil',
  },
  {
    id: 'style-piece',
    group: 'dress',
    href: '/looks/style',
    label: shell.create.stylePiece,
    icon: 'looks',
    keywords: 'three ways',
  },
  { id: 'new-look', group: 'dress', href: '/looks/new', label: shell.create.newLook, icon: 'plus' },
  {
    id: 'trip',
    group: 'dress',
    href: '/trip/new',
    label: shell.create.planTrip,
    icon: 'trip',
    keywords: 'travel pack',
  },
];

export const CREATE_GROUPS: readonly CreateGroup[] = ['add', 'dress'];

// Flagged doors leave the sheet and ⌘K while their feature is off (trips: legacy 2eacfb4).
export function createItems(features: Features): readonly CreateItem[] {
  return CREATE_ITEMS.filter((i) => i.id !== 'trip' || features.trips);
}

export const SOON_TITLES: Record<SoonSlug, string> = {};

// Command bar "Go to": the roots plus the pages under them.
export const GO_TO_ITEMS: readonly NavItem[] = [
  ...NAV_ITEMS,
  { href: '/wardrobe/wishlist', label: wardrobe.segments.wishlist, icon: 'wardrobe' },
  { href: '/wardrobe/inbox', label: wardrobe.segments.inbox, icon: 'mail' },
  { href: '/looks?tab=suggested', label: lookbook.tabs.suggested, icon: 'looks' },
  { href: '/you', label: you.title, icon: 'user' },
  { href: '/you/account', label: you.account.title, icon: 'user' },
  { href: '/you/notifications', label: you.notifications.title, icon: 'user' },
  { href: '/you/privacy', label: you.privacy, icon: 'user' },
  { href: '/you/style', label: you.style.link, icon: 'user' },
];

// Which root owns a path, for aria-current on the nav.
export function activeRoot(pathname: string): string {
  if (pathname.startsWith('/piece')) return '/wardrobe';
  if (pathname.startsWith('/look')) return '/looks';
  const root = NAV_ITEMS.find((i) => i.href !== '/' && pathname.startsWith(i.href));
  return root?.href ?? (pathname === '/' ? '/' : '');
}

// The add-a-piece flow is a task, not a place: the dock stands down there so its one action sits
// at the foot (redline "Hide the tab bar in the add flow").
const FLOW_PATHS = ['/wardrobe/add', '/wardrobe/review', '/wardrobe/link', '/wardrobe/manual'];
export function isFlowPath(pathname: string): boolean {
  return FLOW_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Settings (the avatar's door, /you) is a pushed stack with its own 44pt header row: no wordmark,
// no avatar and no dock there (legacy settings.html, redlines G1–G3).
export function isSettingsPath(pathname: string): boolean {
  return pathname === '/you' || pathname.startsWith('/you/');
}

export interface Back {
  href: string;
  label: string;
}

const DAY = /^\/plan\/(\d{4}-(?:0[1-9]|1[0-2])-\d{2})$/;

// A pushed page's way back: ‹ and the previous screen's own title, in the top bar where the
// wordmark sits on the roots (beta's header; native StackScreen's 44pt row). Decided from the URL
// so the server draws the bar as it will stay — no wordmark flashing before the pill.
export function backFor(pathname: string, search: URLSearchParams): Back | null {
  const day = DAY.exec(pathname)?.[1];
  if (day) {
    return search.get('from') === 'today'
      ? { href: '/', label: plan.day.back(plan.today) }
      : { href: '/plan', label: plan.day.back(monthLabel(day.slice(0, 7))) };
  }
  if (/^\/look\/[^/]+$/.test(pathname)) return { href: '/looks', label: looks.title };
  if (pathname === '/looks/new' || pathname === '/looks/new/photo') {
    return { href: '/looks', label: looks.title };
  }
  if (/^\/looks\/ideas\/[^/]+$/.test(pathname)) {
    return { href: '/looks/ideas', label: shell.segments.ideas };
  }
  if (/^\/looks\/style\/[^/]+$/.test(pathname)) {
    return search.get('from') === 'home' ? { href: '/', label: nav.today } : null;
  }
  if (/^\/piece\/[^/]+$/.test(pathname) || pathname === '/wardrobe/inbox') {
    return { href: '/wardrobe', label: wardrobe.piece.back };
  }
  if (pathname === '/wardrobe/add') return { href: '/wardrobe', label: wardrobe.title };
  if (pathname === '/wardrobe/receipt') return { href: '/wardrobe/add', label: wardrobe.add.title };
  if (pathname === '/wardrobe/manual' || pathname === '/wardrobe/link') {
    const to = search.get('to');
    return {
      href: `/wardrobe/add?to=${isDestination(to) ? to : 'wardrobe'}`,
      label: wardrobe.add.title,
    };
  }
  return null;
}
