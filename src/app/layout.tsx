import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppHeader } from '@/components/layout/app-header'; // Added import

export const metadata: Metadata = {
  title: 'GymTrack Lite',
  description: 'Simplified Gym Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen bg-background text-foreground flex flex-col">
        <AppHeader /> {/* Added AppHeader here */}
        <main className="flex-1 flex flex-col"> {/* Ensure main content can grow */}
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
