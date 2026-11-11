import type { Metadata, Viewport } from 'next';
import '@/styles/globals.scss';
import { site } from '@/content/site';
import { asset } from '@/lib/asset';

export const metadata: Metadata = {
  metadataBase: new URL(site.meta.url),
  title: site.meta.title,
  description: site.meta.description,
  alternates: { canonical: '/' },
  manifest: asset('/manifest.webmanifest'),
  icons: {
    icon: [{ url: asset('/icon.svg'), type: 'image/svg+xml' }],
    apple: [{ url: asset('/apple-icon.png'), sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    title: site.meta.title,
    description: site.meta.description,
    images: [{ url: asset('/og.jpg'), width: 1200, height: 630, alt: site.meta.title }],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.meta.title,
    description: site.meta.description,
    images: [asset('/og.jpg')],
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: site.person.name },
};

export const viewport: Viewport = {
  themeColor: site.meta.themeColor,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Always start at the top: the page is one long choreography and restoring a
// scroll position halfway through a pinned scene looks broken.
const bootScript = `try{history.scrollRestoration='manual';if(location.hash){history.replaceState(null,'',location.pathname+location.search)}scrollTo(0,0)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={site.meta.locale}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        {children}
      </body>
    </html>
  );
}
