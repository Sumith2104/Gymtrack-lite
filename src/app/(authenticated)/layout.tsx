'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
// AppHeader import removed as it's now in RootLayout

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Mock auth check
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated !== 'true') {
      router.replace('/login');
    }
  }, [router]);

  // Potentially show a loading state while checking auth
  if (typeof window !== 'undefined' && localStorage.getItem('isAuthenticated') !== 'true') {
     return <div className="flex h-screen items-center justify-center bg-background"><p className="text-foreground">Loading...</p></div>;
  }

  return (
    // AppHeader removed from here
    <div className="flex-1 container mx-auto py-6 px-4 sm:px-6 lg:px-8"> {/* Changed to flex-1 to allow main content to take space */}
      {children}
    </div>
  );
}
