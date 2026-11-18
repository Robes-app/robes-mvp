import { auth as copy } from '@robes/copy';
import { Wordmark } from '@robes/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';

// Sign in, sign up and the code (design "Sign in and sign up", 18 Nov): on a wide screen the
// member's photograph on the left and the form on the warm ground at the right; under 820px the
// form alone. Native twin: mobile/src/features/auth/AuthScreen.tsx.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-bg min-[820px]:grid-cols-2">
      <div className="relative hidden bg-surface-sunk min-[820px]:block">
        {/* biome-ignore lint/performance/noImgElement: a static file from /public, shown at its own size. */}
        <img
          src="/welcome/member-mirror.webp"
          alt={copy.photoAlt}
          className="absolute inset-0 size-full object-cover object-[center_30%] grayscale"
        />
      </div>
      <div className="warm-ground flex flex-col">
        <header className="px-6 pt-6 min-[820px]:px-10 min-[820px]:pt-8">
          <Link href="/" className="inline-flex min-h-11 items-center text-ink">
            <Wordmark />
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 pt-6 pb-12 min-[820px]:pb-18">
          <div className="w-full max-w-100">{children}</div>
        </main>
      </div>
    </div>
  );
}
