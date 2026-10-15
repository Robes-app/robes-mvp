import { lookbook, nav, shell, wardrobe, you } from '@robes/copy';
import type { IconName } from '@robes/icons/web';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

// The four roots, in the same order on every surface (IA §3.2, UX-11/12).
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: nav.today, icon: 'today' },
  { href: '/wardrobe', label: nav.wardrobe, icon: 'wardrobe' },
  { href: '/looks', label: nav.looks, icon: 'looks' },
  { href: '/plan', label: nav.plan, icon: 'plan' },
];

export const SOON_SLUGS = ['receipt', 'ask'] as const;
export type SoonSlug = (typeof SOON_SLUGS)[number];

export interface CreateItem extends NavItem {
  id: string;
  keywords?: string;
}

// The Create sheet (IA §3.2). Unbuilt options go to one shared "On its way" page.
export const CREATE_ITEMS: readonly CreateItem[] = [
  {
    id: 'photograph',
    href: '/wardrobe/add',
    label: shell.create.photograph,
    icon: 'camera',
    keywords: 'add photo upload',
  },
  {
    id: 'camera-roll',
    href: '/wardrobe/add',
    label: shell.create.cameraRoll,
    icon: 'image',
    keywords: 'add photo upload',
  },
  {
    id: 'style-piece',
    href: '/looks/style',
    label: shell.create.stylePiece,
    icon: 'looks',
    keywords: 'three ways',
  },
  { id: 'link', href: '/wardrobe/link', label: shell.create.link, icon: 'link' },
  { id: 'receipt', href: '/soon/receipt', label: shell.create.receipt, icon: 'mail' },
  { id: 'new-look', href: '/looks/new', label: shell.create.newLook, icon: 'plus' },
  { id: 'ask', href: '/soon/ask', label: shell.create.askRobes, icon: 'ask' },
  {
    id: 'trip',
    href: '/trip/new',
    label: shell.create.planTrip,
    icon: 'trip',
    keywords: 'travel pack',
  },
];

export const SOON_TITLES: Record<SoonSlug, string> = {
  receipt: shell.create.receipt,
  ask: shell.create.askRobes,
};

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
