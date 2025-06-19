
'use client'; // Required for usePathname

import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from '@/components/layout/app-header';
import { usePathname } from 'next/navigation'; // Added import

// export const metadata: Metadata = { // Metadata cannot be used with 'use client'
//   title: 'GymTrack Lite',
//   description: 'Simplified Gym Management',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  // Hide header on /login and also on / (since it redirects to /login)
  const hideHeaderPaths = ['/login', '/'];
  const showAppHeader = !hideHeaderPaths.includes(pathname);

  return (
    <html lang="en" className="dark">
      <head>
        {/* Metadata can be set here if needed, or in individual page.tsx files if dynamic */}
        <title>GymTrack Lite</title>
        <meta name="description" content="Simplified Gym Management" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen bg-background text-foreground flex flex-col">
        {showAppHeader && <AppHeader />}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
