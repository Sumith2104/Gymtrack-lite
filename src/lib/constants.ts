import type { NavItem } from '@/components/layout/app-sidebar'; // Adjust path as needed
import { LayoutDashboard, Users, BarChart3, ScanLine, Megaphone, Settings, Dumbbell } from 'lucide-react';

export const APP_NAME = "GymTrack Lite";
export const APP_LOGO = Dumbbell; // Using an icon as a logo

export const NAV_LINKS: NavItem[] = [
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
    href: '/kiosk', // Note: Kiosk might have a different layout, consider if it belongs in main nav
    icon: ScanLine,
    label: 'Check-in Kiosk',
    external: true, // To open in new tab or indicate it's a different flow
  },
  // "Create Announcement" is likely a dialog/modal, not a main nav item.
  // If it were a page:
  // {
  //   href: '/announcements',
  //   icon: Megaphone,
  //   label: 'Announcements',
  // },
];

export const USER_NAV_LINKS = [
  {
    href: '/profile', // Mock
    icon: Settings,
    label: 'Profile',
  },
];
