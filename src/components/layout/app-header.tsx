
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_NAME, APP_LOGO as AppLogoIcon, NAV_LINKS_HEADER } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { UserCircle, LogOut, Menu as MenuIcon } from 'lucide-react'; // Added MenuIcon
import { useState, useEffect } from 'react';


export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  external?: boolean;
  action?: 'logout';
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [displayGymName, setDisplayGymName] = useState('Gym Owner');
  const [displayOwnerEmail, setDisplayOwnerEmail] = useState('owner@example.com');
  const [isSheetOpen, setIsSheetOpen] = useState(false); // State for mobile nav sheet

  useEffect(() => {
    const storedGymName = localStorage.getItem('gymName');
    const storedOwnerEmail = localStorage.getItem('gymOwnerEmail');
    if (storedGymName) {
      setDisplayGymName(storedGymName);
    }
    if (storedOwnerEmail) {
      setDisplayOwnerEmail(storedOwnerEmail);
    }
  }, []);
  
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('gymId');
    localStorage.removeItem('gymOwnerEmail');
    localStorage.removeItem('gymName');
    localStorage.removeItem('gymDatabaseId');
    setDisplayGymName('Gym Owner');
    setDisplayOwnerEmail('owner@example.com');
    setIsSheetOpen(false); // Close sheet on logout
    router.push('/login');
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
          {NAV_LINKS_HEADER.map((item) => {
            let isActive;
            if (item.external) {
              isActive = false;
            } else if (item.href === '/dashboard') {
              isActive = pathname === item.href;
            } else {
              isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className={cn(
                  "flex items-center gap-1 transition-colors hover:text-primary",
                  item.external 
                    ? "text-foreground/70" 
                    : isActive 
                      ? "text-primary font-semibold" 
                      : "text-foreground/70"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side items: Mobile Menu Trigger (mobile only) and User Dropdown (always visible) */}
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
                  <div className="p-4 border-b">
                    <Link href="/dashboard" className="flex items-center space-x-2" onClick={() => setIsSheetOpen(false)}>
                      <AppLogoIcon className="h-7 w-7 text-primary" />
                      <span className="font-bold text-lg text-foreground">{APP_NAME}</span>
                    </Link>
                  </div>
                  <nav className="flex-1 flex flex-col space-y-1 p-4">
                    {NAV_LINKS_HEADER.map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                      return (
                        <SheetClose asChild key={item.href}>
                          <Link
                            href={item.href}
                            target={item.external ? '_blank' : undefined}
                            rel={item.external ? 'noopener noreferrer' : undefined}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                            onClick={() => setIsSheetOpen(false)}
                          >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                <UserCircle className="h-6 w-6 text-primary hover:text-primary/90" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {displayGymName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                     {displayOwnerEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
