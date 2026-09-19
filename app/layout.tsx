import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Instrument_Serif, Inter, Inter_Tight } from 'next/font/google';
import './globals.css';

// next/font downloads these at build time and serves them from our own domain,
// so no visitor's request goes to Google.
const serif = Instrument_Serif({ variable: '--font-serif-face', subsets: ['latin'], weight: '400', style: ['normal', 'italic'] });
const heading = Inter_Tight({ variable: '--font-heading-face', subsets: ['latin'], weight: ['500', '600'] });
const sans = Inter({ variable: '--font-sans-face', subsets: ['latin'] });
const mono = IBM_Plex_Mono({ variable: '--font-mono-face', subsets: ['latin'], weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Dropwatch · The cheapest link, found for you',
  description: 'Type what you want. Dropwatch checks the stores and hands you the cheapest link, including sneaker prices in your size across Indian resellers.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#151412' },
    { media: '(prefers-color-scheme: light)', color: '#F3EEE7' },
  ],
};

// Sets the saved theme before first paint so there is no flash of the wrong one.
const themeScript = `try{var t=localStorage.getItem('dw-theme');if(t==='daylight'||t==='evening')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-theme="evening" suppressHydrationWarning className={`${serif.variable} ${heading.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
