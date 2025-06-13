
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    if (isAuthenticated !== 'true') {
      setAuthStatus('unauthenticated');
      router.replace('/login');
    } else {
      setAuthStatus('authenticated');
    }
  }, [router]);

  if (authStatus === 'checking') {
    return (
      <div className="flex flex-1 h-full items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    // This case should ideally not be visible for long due to router.replace,
    // but it's good practice to handle it.
    // You could return null or a different loading/redirecting message.
    return (
        <div className="flex flex-1 h-full items-center justify-center bg-background">
            <p className="text-foreground">Redirecting to login...</p>
        </div>
    );
  }

  // Only render children if authenticated
  return (
    <div className="flex-1 container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
