import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';
import { Belleza, Alegreya } from 'next/font/google';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';


const belleza = Belleza({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-belleza',
});

const alegreya = Alegreya({
  subsets: ['latin'],
  variable: '--font-alegreya',
});

export const metadata: Metadata = {
  title: 'Locket Photo Print',
  description: 'Upload and prepare your photos for printing.',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#94D8A9" />
      </head>
      <body className={`${belleza.variable} ${alegreya.variable} font-serif antialiased flex flex-col min-h-screen bg-background`}>
        <AuthProvider>
            <Header />
            {children}
            <Footer />
            <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
