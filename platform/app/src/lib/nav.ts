import type { Features } from '@robes/contracts';
import { lookbook, nav, shell, wardrobe, you } from '@robes/copy';
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
