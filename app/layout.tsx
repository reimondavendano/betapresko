import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ReduxProvider } from '@/components/providers/ReduxProvider';

// const inter = Inter({ subsets: ['latin'] });
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Presko Aircon Services - Professional AC Cleaning',
  description: 'Professional aircon cleaning and maintenance services in Bulacan. Book your appointment today!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
