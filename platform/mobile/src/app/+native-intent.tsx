import { nativePath } from '@/lib/links';

// Deep links (robes://…, universal links) arrive with web paths; route them to native screens.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return nativePath(path);
}
