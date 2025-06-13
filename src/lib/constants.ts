import type { NavItem } from '@/components/layout/app-header'; // Adjusted path
import { LayoutDashboard, Users, BarChart3, ScanLine, Megaphone, Settings, Dumbbell, LogOut } from 'lucide-react';

export const APP_NAME = "GymTrack Lite";
export const APP_LOGO = Dumbbell; // Using an icon as a logo

// For the new header navigation
export const NAV_LINKS_HEADER: NavItem[] = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/kiosk',
    icon: ScanLine,
    label: 'Check-in',
    external: true, // To open in new tab
  },
  {
    href: '/members',
    icon: Users,
    label: 'Members',
  },
  {
    href: '/new-announcement', // Link to a page for creating announcements
    icon: Megaphone, // Could also be PlusSquare or Edit
    label: 'New Announce',
  },
  {
    href: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
  },
];


// Original NAV_LINKS, can be deprecated or repurposed if sidebar is removed
export const NAV_LINKS_SIDEBAR: NavItem[] = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/members',
    icon: Users,
    label: 'Member Management',
  },
  {
    href: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
  },
  {
    href: '/kiosk', 
    icon: ScanLine,
    label: 'Check-in Kiosk',
    external: true, 
  },
];

export const USER_NAV_LINKS = [
  {
    href: '/profile', // Mock
    icon: Settings,
    label: 'Profile',
  },
   {
    href: '/login', // For logout functionality
    icon: LogOut,
    label: 'Logout',
    action: 'logout' // Special flag for logout
  }
];
