import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { connection } from 'next/server';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { Providers } from '@/components/providers';
import { env } from '@/server/env';
import { currentConsents } from '@/server/session';
import './globals.css';

// Self-hosted (SIL OFL, docs/design-system.md): a build never fetches Google Fonts, whose download
// failed CI about one run in three (7 Nov). Variable Latin files, so each holds every weight.
const cormorant = localFont({
  src: [
    { path: './fonts/Cormorant-Roman-Latin.woff2', weight: '300 700', style: 'normal' },
    { path: './fonts/Cormorant-Italic-Latin.woff2', weight: '300 700', style: 'italic' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});
const inter = localFont({
  src: [{ path: './fonts/Inter-Latin.woff2', weight: '100 900', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = { title: 'Robes', description: 'Your wardrobe, styled.' };

// The CSP nonce is per request, so every page must render dynamically (Next CSP guide).
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const state = await currentConsents();
  return (
    // Light only, as beta: a dark-mode device must still see cream (dark waits for a setting).
    <html lang="en" data-theme="light" className={`${cormorant.variable} ${inter.variable}`}>
      <body>
        <Providers>
          <AnalyticsProvider
            config={env.observability.posthog ?? null}
            userId={state?.userId ?? null}
            initialConsents={state?.consents ?? null}
          >
            {children}
          </AnalyticsProvider>
        </Providers>
      </body>
    </html>
  );
}
