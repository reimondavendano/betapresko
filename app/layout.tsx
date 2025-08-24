import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Poppins } from 'next/font/google';
import { ReduxProvider } from '@/components/providers/ReduxProvider';


// const inter = Inter({ subsets: ['latin'] });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // pick the weights you need
  variable: "--font-poppins",           // optional: CSS variable
});

export const metadata: Metadata = {
  title: 'Presko Aircon Services - Professional AC Cleaning',
  description: 'Professional aircon cleaning and maintenance services in Bulacan. Book your appointment today!',
  icons: {
    icon: "/presko_logo.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
