import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? 'Naman Enterprises';
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

// Default social-share preview image (1200×630). Used for OpenGraph +
// Twitter cards so WhatsApp/FB/X links render a preview instead of a blank
// card. Phase-2: replace with a branded, commissioned OG image asset.
const OG_IMAGE =
  'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200&h=630&fit=crop&q=80&auto=format';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: storeName,
    template: `%s · ${storeName}`,
  },
  description:
    'Buy genuine and compatible printer ink cartridges, toner cartridges, and ink bottles for HP, Canon, Epson, Brother, Lexmark, and more — fast pan-India delivery and GST invoices.',
  applicationName: storeName,
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: storeName,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${storeName} — genuine printer ink, toner & cartridges`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-background font-sans text-foreground antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
