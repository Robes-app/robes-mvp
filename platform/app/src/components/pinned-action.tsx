import type { ReactNode } from 'react';

// A flow's one action, pinned to the foot above the safe area on a phone (redline "one primary
// button spec"); on wide screens it sits in the flow. A spacer keeps the page's end clear of it.
// Native twin: mobile/src/components/PinnedAction.tsx.
export function PinnedAction({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="h-24 md:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-30 border-hairline border-t bg-bg/95 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">{children}</div>
      </div>
    </>
  );
}
