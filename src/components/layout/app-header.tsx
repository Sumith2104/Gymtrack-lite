
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
import { UserCircle, LogOut } from 'lucide-react';


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
  
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('gymId');
    localStorage.removeItem('gymOwnerEmail');
    localStorage.removeItem('gymName');
    localStorage.removeItem('gymDatabaseId');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <div className="flex gap-6 md:gap-10">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <AppLogoIcon className="h-7 w-7 text-primary" />
            <span className="inline-block font-bold text-lg text-foreground">{APP_NAME}</span>
          </Link>
        </div>

        <nav className="hidden md:flex flex-1 items-center justify-center space-x-6 text-sm font-medium">
          {NAV_LINKS_HEADER.map((item) => {
            let isActive;
            if (item.external) {
              isActive = false;
            } else if (item.href === '/dashboard') {
              // Dashboard is active only on exact match
              isActive = pathname === item.href;
            } else {
              // Other internal links are active if it's an exact match or a sub-path
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
                  // Apply active/inactive styling:
                  // External links get default non-active styling.
                  // Internal links get active or inactive styling.
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

        <div className="flex items-center justify-end space-x-4">
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
                    {typeof window !== 'undefined' ? localStorage.getItem('gymName') || 'Gym Owner' : 'Gym Owner'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                     {typeof window !== 'undefined' ? localStorage.getItem('gymOwnerEmail') || 'owner@example.com' : 'owner@example.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* Add items like Profile, Settings if needed */}
              {/* <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem> */}
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
           {/* Mobile Menu Trigger - can be implemented with Sheet if needed */}
           {/* <Button variant="ghost" size="icon" className="md:hidden"> <Menu className="h-6 w-6" /> <span className="sr-only">Menu</span></Button> */}
        </div>
      </div>
    </header>
  );
}
