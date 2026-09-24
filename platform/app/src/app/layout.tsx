import type { Metadata } from 'next';
import { Cormorant, Inter } from 'next/font/google';
import { connection } from 'next/server';
import './globals.css';

const cormorant = Cormorant({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
});

export const metadata: Metadata = { title: 'Robes', description: 'Your wardrobe, styled.' };

// The CSP nonce is per request, so every page must render dynamically (Next CSP guide).
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
