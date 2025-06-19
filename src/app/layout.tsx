
'use client'; 

import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from '@/components/layout/app-header';
import { usePathname } from 'next/navigation'; 


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  
  const hideHeaderPaths = ['/login', '/'];
  const showAppHeader = !hideHeaderPaths.includes(pathname);

  return (
    <html lang="en" className="dark">
      <head>
        
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
