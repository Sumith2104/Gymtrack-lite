
import type { NavItem } from '@/lib/types';
import { LayoutDashboard, Users, BarChart3, ScanLine, Megaphone, Settings, Dumbbell, LogOut, MessageSquare } from 'lucide-react';

export const APP_NAME = "GymTrack Lite";
export const APP_LOGO = Dumbbell;
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'; // Used for email template links, logo etc.
export const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || APP_NAME; // Used in email "From" field if SMTP_FROM_EMAIL doesn't include a name part

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
    href: '/messages',
    icon: MessageSquare,
    label: 'Messages',
  },
  {
    href: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
  },
  {
    href: '/new-announcement',
    icon: Megaphone,
    label: 'New Announce',
  },
  {
    href: '/profile', 
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

export const USER_NAV_LINKS: NavItem[] = [
  // Items have been moved to NAV_LINKS_HEADER
];
