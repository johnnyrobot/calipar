import type { Metadata } from 'next';
import { Inter, Archivo, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Maritime type system: Archivo (display), Inter (UI/body), IBM Plex Mono (data).
const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const archivo = Archivo({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CALIPAR - Program Review & Integrated Planning',
  description: 'AI-Enhanced Program Review and Integrated Planning Platform for Educational Institutions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${archivo.variable} ${ibmPlexMono.variable}`}
    >
      <body className="font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
