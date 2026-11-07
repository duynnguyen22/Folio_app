import '@folio/tokens/folio.css';
import './globals.css';
import type { Metadata } from 'next';
import { Cormorant_Garamond, Instrument_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

const display = Cormorant_Garamond({
  subsets: ['latin', 'vietnamese'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
});

const ui = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-instrument',
});

export const metadata: Metadata = { title: 'Folio' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${ui.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
