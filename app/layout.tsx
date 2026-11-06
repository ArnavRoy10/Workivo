// @ts-expect-error Next.js processes this stylesheet import at build time.
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { EditBar } from '@/components/site-content/edit-bar';
import { SiteContentProvider } from '@/components/site-content/provider';
import { fetchSiteContent } from '@/lib/server/site-content';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Workivo — Find Work. Find People. Build Opportunities.',
  description:
    'Whether you\'re looking for your next opportunity or someone to join your team, Workivo helps you connect.',
  openGraph: {
    title: 'Workivo — Find Work. Find People. Build Opportunities.',
    description:
      'A modern work marketplace where everyone can find work and find people. Full-time, part-time, freelance, gig, remote, and more.',
    siteName: 'Workivo',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Workivo',
    description: 'Find Work. Find People. Build Opportunities.',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialSiteContent = await fetchSiteContent();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <SiteContentProvider initial={initialSiteContent}>
              {children}
              <EditBar />
            </SiteContentProvider>
            <Toaster position="bottom-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}