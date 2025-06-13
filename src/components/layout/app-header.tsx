'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserCircle, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { APP_NAME, APP_LOGO as AppLogoIcon, NAV_LINKS } from '@/lib/constants';
import { useSidebar, SidebarTrigger } from '@/components/ui/sidebar'; // Assuming SidebarTrigger is exported

export function AppHeader() {
  const router = useRouter();
  const { isMobile, toggleSidebar } = useSidebar();


  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated'); // Mock logout
    localStorage.removeItem('gymId');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {isMobile ? (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
      ) : (
        <SidebarTrigger className="hidden md:flex" />
      )}
      
      <div className="flex-1">
        {/* Optional: Breadcrumbs or page title can go here */}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <UserCircle className="h-6 w-6 text-primary" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">Gym Owner</p>
              <p className="text-xs leading-none text-muted-foreground">
                owner@example.com
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Add items like Profile, Settings if needed */}
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
