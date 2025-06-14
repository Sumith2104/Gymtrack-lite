
import type { NavItem } from '@/components/layout/app-header';
import { LayoutDashboard, Users, BarChart3, ScanLine, Megaphone, Settings, Dumbbell, LogOut } from 'lucide-react';
// MOCK_MEMBERSHIP_PLANS and AVAILABLE_MEMBERSHIP_TYPES are removed as plans will be fetched from DB.

export const APP_NAME = "GymTrack Lite";
export const APP_LOGO = Dumbbell;

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
  },
  {
    href: '/members',
    icon: Users,
    label: 'Members',
  },
  {
    href: '/new-announcement',
    icon: Megaphone,
    label: 'New Announce',
  },
  {
    href: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
  },
];

export const USER_NAV_LINKS = [
  {
    href: '/profile', // Mock
    icon: Settings,
    label: 'Profile',
  },
   {
    href: '/login',
    icon: LogOut,
    label: 'Logout',
    action: 'logout'
  }
];
