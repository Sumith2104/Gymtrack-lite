
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { NavItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { APP_NAME, APP_LOGO as AppLogoIcon, NAV_LINKS_HEADER } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader, 
  SheetTitle,  
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Menu as MenuIcon } from 'lucide-react';
import { useState } from 'react';


export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false); 
  
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('gymId');
    localStorage.removeItem('gymOwnerEmail');
    localStorage.removeItem('gymName');
    localStorage.removeItem('gymDatabaseId');
    setIsSheetOpen(false); 
    router.push('/login');
  };

  const renderNavItem = (item: NavItem, isMobile = false) => {
    const commonClasses = isMobile
      ? "flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium transition-colors"
      : "flex items-center gap-1 transition-colors hover:text-primary";

    const activeClasses = isMobile
      ? "bg-primary/10 text-primary"
      : "text-primary font-semibold";
    
    const inactiveClasses = isMobile
      ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      : "text-foreground/70";

    const externalClasses = "text-foreground/70";
    
    if (item.action === 'logout') {
      return (
        <button
          key={item.label}
          onClick={handleLogout}
          className={cn(commonClasses, inactiveClasses)}
        >
          <item.icon className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
          {item.label}
        </button>
      );
    }

    let isActive;
    if (item.external) {
      isActive = false;
    } else if (item.href === '/dashboard') {
      isActive = pathname === item.href;
    } else {
      isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    }

    const linkContent = (
      <>
        <item.icon className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
        {item.label}
      </>
    );

    const linkProps = {
      href: item.href,
      target: item.external ? '_blank' : undefined,
      rel: item.external ? 'noopener noreferrer' : undefined,
      className: cn(commonClasses, item.external ? externalClasses : (isActive ? activeClasses : inactiveClasses)),
    };

    if (isMobile) {
      return (
        <SheetClose asChild key={item.href}>
          <Link {...linkProps} onClick={() => setIsSheetOpen(false)}>
            {linkContent}
          </Link>
        </SheetClose>
      );
    }

    return (
      <Link key={item.href} {...linkProps}>
        {linkContent}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo and App Name */}
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center space-x-2" onClick={() => setIsSheetOpen(false)}>
            <AppLogoIcon className="h-7 w-7 text-primary" />
            <span className="inline-block font-bold text-lg text-foreground">{APP_NAME}</span>
          </Link>
        </div>

        {/* Desktop Navigation - Centered */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {NAV_LINKS_HEADER.map((item) => renderNavItem(item, false))}
        </nav>

        {/* Right side items: Mobile Menu Trigger (mobile only) */}
        <div className="flex items-center gap-2">
          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MenuIcon className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <div className="flex flex-col h-full">
                  <SheetHeader className="p-4 border-b">
                    <SheetTitle className="sr-only">{APP_NAME} Navigation Menu</SheetTitle>
                    <Link href="/dashboard" className="flex items-center space-x-2" onClick={() => setIsSheetOpen(false)}>
                      <AppLogoIcon className="h-7 w-7 text-primary" />
                      <span className="font-bold text-lg text-foreground">{APP_NAME}</span>
                    </Link>
                  </SheetHeader>
                  <nav className="flex-1 flex flex-col space-y-1 p-4">
                    {NAV_LINKS_HEADER.map((item) => renderNavItem(item, true))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
