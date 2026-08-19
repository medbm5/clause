import type { Metadata, Viewport } from 'next';
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Clause — find out what you are signing',
  description:
    'Upload an Indian rental agreement or health insurance policy and get every one-sided clause flagged in plain English, with what is normal and what to ask for instead.',
};

export const viewport: Viewport = {
  themeColor: '#e6e9e2',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plexSans.variable} ${plexMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
