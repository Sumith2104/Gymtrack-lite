'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { APP_NAME, APP_LOGO as AppLogoIcon, NAV_LINKS } from '@/lib/constants';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';


export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  external?: boolean;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { state: sidebarState, isMobile, setOpenMobile } = useSidebar();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated'); // Mock logout
    localStorage.removeItem('gymId');
    router.push('/login');
    if (isMobile) setOpenMobile(false);
  };
  
  return (
    <Sidebar side="left" variant="sidebar" collapsible={isMobile ? "offcanvas" : "icon"}>
      <SidebarHeader className="border-b">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={() => isMobile && setOpenMobile(false)}>
          <AppLogoIcon className="h-8 w-8 text-primary" />
          {sidebarState === 'expanded' && <span className="text-xl font-headline">{APP_NAME}</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {NAV_LINKS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild={!item.external}
                href={item.external ? item.href : undefined}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                onClick={() => {
                  if (!item.external) router.push(item.href);
                  if (isMobile) setOpenMobile(false);
                }}
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                tooltip={item.label}
                className="justify-start"
              >
                {item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-2">
                     <item.icon />
                     <span>{item.label}</span>
                  </a>
                ) : (
                  <>
                    <item.icon />
                    <span>{item.label}</span>
                  </>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            {sidebarState === 'expanded' && <span>Logout</span>}
          </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
