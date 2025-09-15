
'use client'; 

import { AppHeader } from '@/components/layout/app-header';
import { usePathname } from 'next/navigation'; 

export function LayoutClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const hideHeaderPaths = ['/login', '/'];
  const showAppHeader = !hideHeaderPaths.includes(pathname);

  return (
    <>
      {showAppHeader && <AppHeader />}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </>
  )
}
